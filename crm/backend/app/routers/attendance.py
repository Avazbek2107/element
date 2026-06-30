from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date
from app.database import get_db
from app.models.user import User, UserRole
from app.models.attendance import Attendance, AttendanceStatus
from app.models.student import StudentProfile
from app.models.group import Group
from app.schemas.attendance import AttendanceMark, AttendanceOut, AttendanceDaySummary
from app.utils.auth import require_roles

router = APIRouter(prefix="/api/attendance", tags=["attendance"])

AdminOrTeacher = require_roles(UserRole.admin, UserRole.teacher)


@router.get("", response_model=List[AttendanceOut])
def list_attendance(
    group_id: int = Query(...),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    q = db.query(Attendance).filter(Attendance.group_id == group_id)
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
        )
        for r in records
    ]


@router.post("")
def mark_attendance(
    body: AttendanceMark,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    # O'sha kun va guruh uchun mavjud yozuvlarni o'chiramiz (qayta belgilash)
    db.query(Attendance).filter(
        Attendance.group_id == body.group_id,
        Attendance.date == body.date,
    ).delete()

    for item in body.records:
        record = Attendance(
            student_id=item.student_id,
            group_id=body.group_id,
            date=body.date,
            status=item.status,
            late_minutes=item.late_minutes if item.status == AttendanceStatus.late else None,
            note=item.note,
        )
        db.add(record)

    db.commit()
    return {"message": "Yo'qlama saqlandi", "count": len(body.records)}


@router.get("/summary")
def attendance_summary(
    group_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
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
            by_date[d] = {"date": row.date, "present": 0, "absent": 0, "late": 0}
        by_date[d][row.status] = row.cnt

    result = []
    for d, v in by_date.items():
        total = v["present"] + v["absent"] + v["late"]
        result.append({**v, "total": total})

    return result


@router.get("/today")
def today_stats(
    group_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    from datetime import date as dt
    today = dt.today()

    base = db.query(Attendance).filter(Attendance.date == today)
    if group_id:
        base = base.filter(Attendance.group_id == group_id)

    present = base.filter(Attendance.status == AttendanceStatus.present).count()
    absent  = base.filter(Attendance.status == AttendanceStatus.absent).count()
    late    = base.filter(Attendance.status == AttendanceStatus.late).count()

    return {
        "date": today,
        "present": present,
        "absent": absent,
        "late": late,
        "total": present + absent + late,
    }
