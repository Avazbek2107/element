from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from datetime import date, datetime
from app.database import get_db
from app.models.user import User, UserRole
from app.models.attendance import Attendance, AttendanceStatus
from app.models.student import StudentProfile
from app.models.group import Group
from app.schemas.attendance import AttendanceMark, AttendanceOut, AttendanceDaySummary
from app.utils.auth import get_current_user, require_roles
from app.utils.notify import send_telegram_message

router = APIRouter(prefix="/api/attendance", tags=["attendance"])

AdminOrTeacher = require_roles(UserRole.admin, UserRole.teacher, module="attendance")


def _teacher_group_ids(user: User, db: Session) -> list[int]:
    from app.models.group import Group as _Group
    groups = db.query(_Group.id).filter(_Group.teacher_id == user.id, _Group.is_active == True).all()
    return [g.id for g in groups]


def _check_group_access(user: User, group_id: int, db: Session):
    if user.role == UserRole.teacher:
        ids = _teacher_group_ids(user, db)
        if group_id not in ids:
            raise HTTPException(status_code=403, detail="Bu guruhga kirish ruxsati yo'q")


@router.get("", response_model=List[AttendanceOut])
def list_attendance(
    group_id:  int            = Query(...),
    date_from: Optional[date] = Query(None),
    date_to:   Optional[date] = Query(None),
    db:        Session        = Depends(get_db),
    current_user: User        = Depends(AdminOrTeacher),
):
    _check_group_access(current_user, group_id, db)
    q = db.query(Attendance).options(
        joinedload(Attendance.student).joinedload(StudentProfile.user)
    ).filter(Attendance.group_id == group_id)
    if date_from:
        q = q.filter(Attendance.date >= date_from)
    if date_to:
        q = q.filter(Attendance.date <= date_to)
    records = q.order_by(Attendance.date.desc()).all()
    return [
        AttendanceOut(
            id=r.id,
            student_id=r.student_id,
            student_name=f"{r.student.user.first_name} {r.student.user.last_name}",
            group_id=r.group_id,
            date=r.date,
            status=r.status,
            late_minutes=r.late_minutes,
            note=r.note,
            module_id=r.module_id,
            topic_id=r.topic_id,
        )
        for r in records
    ]


@router.post("")
def mark_attendance(
    body: AttendanceMark,
    db:   Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    _check_group_access(current_user, body.group_id, db)
    valid_student_ids = {
        s.id for s in db.query(StudentProfile.id).filter(StudentProfile.group_id == body.group_id).all()
    }
    for item in body.records:
        if item.student_id not in valid_student_ids:
            raise HTTPException(403, "O'quvchi bu guruhga tegishli emas")

    db.query(Attendance).filter(
        Attendance.group_id == body.group_id,
        Attendance.date     == body.date,
    ).delete()

    for item in body.records:
        record = Attendance(
            student_id   = item.student_id,
            group_id     = body.group_id,
            date         = body.date,
            status       = item.status,
            late_minutes = item.late_minutes if item.status == AttendanceStatus.late else None,
            note         = item.note,
            module_id    = body.module_id,
            topic_id     = body.topic_id,
        )
        db.add(record)

    db.commit()

    group = db.query(Group).filter(Group.id == body.group_id).first()
    group_name = group.name if group else ""
    STATUS_TEXT = {
        AttendanceStatus.present: "✅ {name} bugun ({date}) {group} darsiga keldi.",
        AttendanceStatus.late:    "⏰ {name} bugun ({date}) {group} darsiga kechikib keldi.",
        AttendanceStatus.absent:  "❌ {name} bugun ({date}) {group} darsiga kelmadi.",
        AttendanceStatus.excused: "ℹ️ {name} bugun ({date}) {group} darsiga sababli kelmadi.",
    }
    for item in body.records:
        template = STATUS_TEXT.get(item.status)
        if not template:
            continue
        profile = db.query(StudentProfile).filter(StudentProfile.id == item.student_id).first()
        if not profile or not profile.parent_telegram_id:
            continue
        student_name = f"{profile.user.first_name} {profile.user.last_name}"
        send_telegram_message(
            profile.parent_telegram_id,
            template.format(name=student_name, date=body.date, group=group_name),
        )

    return {"message": "Yo'qlama saqlandi", "count": len(body.records)}


@router.get("/notifications")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.teacher, module="attendance")),
):
    today      = date.today()
    now        = datetime.now()
    now_hours  = now.hour + now.minute / 60

    day_map = {0:'monday',1:'tuesday',2:'wednesday',3:'thursday',4:'friday',5:'saturday',6:'sunday'}
    today_key = day_map[today.weekday()]

    q = db.query(Group).filter(Group.is_active == True)
    if current_user.role == UserRole.teacher:
        q = q.filter(Group.teacher_id == current_user.id)
    groups = q.all()

    notifications = []
    for group in groups:
        if not group.schedule:
            continue
        entry = group.schedule.get(today_key)
        if not entry:
            continue

        time_str = entry if isinstance(entry, str) else (entry.get('time', '') if isinstance(entry, dict) else '')
        if not time_str or '-' not in time_str:
            continue

        try:
            end_str  = time_str.split('-')[1].strip()
            eh, em   = end_str.split(':')
            end_time = int(eh) + int(em) / 60
        except Exception:
            continue

        if now_hours <= end_time:
            continue

        count = db.query(Attendance).filter(
            Attendance.group_id == group.id,
            Attendance.date     == today,
        ).count()

        if count == 0:
            notifications.append({
                'type':       'missed_class',
                'group_id':   group.id,
                'group_name': group.name,
                'date':       str(today),
                'time':       time_str,
                'message':    f"{group.name} — yo'qlama belgilanmagan ({time_str})",
            })

    return notifications


@router.get("/summary")
def attendance_summary(
    group_id: int     = Query(...),
    db:       Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    _check_group_access(current_user, group_id, db)
    rows = (
        db.query(
            Attendance.date,
            Attendance.status,
            func.count(Attendance.id).label("cnt"),
        )
        .filter(Attendance.group_id == group_id)
        .group_by(Attendance.date, Attendance.status)
        .order_by(Attendance.date.desc())
        .all()
    )

    by_date = {}
    for row in rows:
        d = str(row.date)
        if d not in by_date:
            by_date[d] = {"date": row.date, "present": 0, "absent": 0, "late": 0, "excused": 0}
        by_date[d][row.status] = row.cnt

    result = []
    for d, v in by_date.items():
        total = v["present"] + v["absent"] + v["late"] + v["excused"]
        result.append({**v, "total": total})

    return result


@router.get("/today")
def today_stats(
    group_id: Optional[int] = Query(None),
    db:       Session       = Depends(get_db),
    current_user: User      = Depends(AdminOrTeacher),
):
    today = date.today()

    base = db.query(Attendance).filter(Attendance.date == today)
    if group_id:
        _check_group_access(current_user, group_id, db)
        base = base.filter(Attendance.group_id == group_id)
    elif current_user.role == UserRole.teacher:
        ids = _teacher_group_ids(current_user, db)
        base = base.filter(Attendance.group_id.in_(ids))

    present = base.filter(Attendance.status == AttendanceStatus.present).count()
    absent  = base.filter(Attendance.status == AttendanceStatus.absent).count()
    late    = base.filter(Attendance.status == AttendanceStatus.late).count()
    excused = base.filter(Attendance.status == AttendanceStatus.excused).count()

    return {
        "date":    today,
        "present": present,
        "absent":  absent,
        "late":    late,
        "excused": excused,
        "total":   present + absent + late + excused,
    }
