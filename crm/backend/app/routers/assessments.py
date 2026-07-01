from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import date as date_type

from app.database import get_db
from app.models.user import User, UserRole
from app.models.assessment import Assessment, GroupReportSchedule
from app.models.student import StudentProfile
from app.models.group import Group
from app.schemas.assessment import AssessmentBulkSave, AssessmentOut, ScheduleCreate, ScheduleOut
from app.utils.auth import require_roles
from app.utils.notify import send_telegram_message, _progress_bar

router = APIRouter(prefix="/api/assessments", tags=["assessments"])

AdminOrTeacher = require_roles(UserRole.admin, UserRole.teacher, module="assessments")


def _build_assessment_msg(a: Assessment, group_name: str, student_name: str, d: date_type) -> str:
    lines = [
        "📊 <b>Bugungi dars natijasi</b>",
        f"📅 {d}  |  📚 {group_name}",
        "",
        f"👤 <b>{student_name}</b>",
        "━━━━━━━━━━━━━━━━━━",
    ]

    has_any = False

    if a.qa_correct is not None and a.qa_total:
        pct = round(a.qa_correct / a.qa_total * 100)
        lines += [
            "",
            f"📝 <b>Savol-javob:</b>  {a.qa_correct}/{a.qa_total} = {pct}%",
            f"<code>{_progress_bar(pct)}</code>  {pct}%",
        ]
        has_any = True

    if a.test_correct is not None and a.test_total:
        pct = round(a.test_correct / a.test_total * 100)
        lines += [
            "",
            f"🧪 <b>Test natijasi:</b>  {a.test_correct}/{a.test_total} = {pct}%",
            f"<code>{_progress_bar(pct)}</code>  {pct}%",
        ]
        has_any = True

    if a.activity_score is not None:
        pct = round(a.activity_score / 10 * 100)
        lines += [
            "",
            f"⭐ <b>Faollik:</b>  {a.activity_score}/10 = {pct}%",
            f"<code>{_progress_bar(pct)}</code>  {pct}%",
        ]
        has_any = True

    if not has_any:
        return ""

    if a.note:
        lines += ["", f"💬 {a.note}"]

    return "\n".join(lines)


def _send_assessment(a: Assessment, group_name: str, db: Session) -> bool:
    if not a.student:
        return False
    parent_id = a.student.parent_telegram_id
    if not parent_id:
        return False
    student_name = ""
    if a.student.user:
        student_name = f"{a.student.user.first_name} {a.student.user.last_name}"
    msg = _build_assessment_msg(a, group_name, student_name, a.date)
    if not msg:
        return False
    send_telegram_message(parent_id, msg)
    return True


def _check_group_access(user: User, group_id: int, db: Session):
    if user.role == UserRole.teacher:
        g = db.query(Group).filter(Group.id == group_id, Group.teacher_id == user.id).first()
        if not g:
            raise HTTPException(403, "Bu guruhga kirish ruxsati yo'q")


@router.get("", response_model=List[AssessmentOut])
def list_assessments(
    group_id: int       = Query(...),
    date:     date_type = Query(...),
    db:       Session   = Depends(get_db),
    current_user: User  = Depends(AdminOrTeacher),
):
    _check_group_access(current_user, group_id, db)
    records = (
        db.query(Assessment)
        .options(joinedload(Assessment.student).joinedload(StudentProfile.user))
        .filter(Assessment.group_id == group_id, Assessment.date == date)
        .all()
    )
    result = []
    for a in records:
        name = ""
        if a.student and a.student.user:
            name = f"{a.student.user.first_name} {a.student.user.last_name}"
        result.append(AssessmentOut(
            id=a.id,
            student_id=a.student_id,
            student_name=name,
            group_id=a.group_id,
            date=a.date,
            qa_correct=a.qa_correct,
            qa_total=a.qa_total,
            test_correct=a.test_correct,
            test_total=a.test_total,
            activity_score=a.activity_score,
            note=a.note,
        ))
    return result


@router.post("/bulk")
def bulk_save(
    body:         AssessmentBulkSave,
    send:         bool    = Query(False),
    db:           Session = Depends(get_db),
    current_user: User    = Depends(AdminOrTeacher),
):
    _check_group_access(current_user, body.group_id, db)
    group = db.query(Group).filter(Group.id == body.group_id).first()
    group_name = group.name if group else ""

    valid_student_ids = {
        s.id for s in db.query(StudentProfile.id).filter(StudentProfile.group_id == body.group_id).all()
    }
    for item in body.items:
        if item.student_id not in valid_student_ids:
            raise HTTPException(403, "O'quvchi bu guruhga tegishli emas")

    sent = 0
    for item in body.items:
        has_data = any(v is not None for v in [item.qa_correct, item.test_correct, item.activity_score])

        existing = db.query(Assessment).filter(
            Assessment.student_id == item.student_id,
            Assessment.group_id   == body.group_id,
            Assessment.date       == body.date,
        ).first()

        if existing:
            existing.qa_correct     = item.qa_correct
            existing.qa_total       = item.qa_total
            existing.test_correct   = item.test_correct
            existing.test_total     = item.test_total
            existing.activity_score = item.activity_score
            existing.note           = item.note
        elif has_data:
            a = Assessment(
                student_id=item.student_id,
                group_id=body.group_id,
                date=body.date,
                qa_correct=item.qa_correct,
                qa_total=item.qa_total,
                test_correct=item.test_correct,
                test_total=item.test_total,
                activity_score=item.activity_score,
                note=item.note,
            )
            db.add(a)
            db.flush()
            existing = a

    db.commit()

    if send:
        records = (
            db.query(Assessment)
            .options(joinedload(Assessment.student).joinedload(StudentProfile.user))
            .filter(Assessment.group_id == body.group_id, Assessment.date == body.date)
            .all()
        )
        for a in records:
            if _send_assessment(a, group_name, db):
                sent += 1

    return {"ok": True, "sent": sent}


@router.post("/send-report")
def send_report(
    group_id:     int       = Query(...),
    date:         date_type = Query(...),
    db:           Session   = Depends(get_db),
    current_user: User      = Depends(AdminOrTeacher),
):
    _check_group_access(current_user, group_id, db)
    group = db.query(Group).filter(Group.id == group_id).first()
    group_name = group.name if group else ""

    records = (
        db.query(Assessment)
        .options(joinedload(Assessment.student).joinedload(StudentProfile.user))
        .filter(Assessment.group_id == group_id, Assessment.date == date)
        .all()
    )

    sent = 0
    for a in records:
        if _send_assessment(a, group_name, db):
            sent += 1

    return {"sent": sent, "total": len(records)}


@router.get("/schedule/{group_id}", response_model=ScheduleOut)
def get_schedule(
    group_id:     int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(AdminOrTeacher),
):
    _check_group_access(current_user, group_id, db)
    s = db.query(GroupReportSchedule).filter(GroupReportSchedule.group_id == group_id).first()
    if not s:
        raise HTTPException(404, "Jadval topilmadi")
    return s


@router.post("/schedule", response_model=ScheduleOut)
def set_schedule(
    body:         ScheduleCreate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(AdminOrTeacher),
):
    _check_group_access(current_user, body.group_id, db)
    s = db.query(GroupReportSchedule).filter(GroupReportSchedule.group_id == body.group_id).first()
    if s:
        s.send_hour   = body.send_hour
        s.send_minute = body.send_minute
        s.is_active   = body.is_active
    else:
        s = GroupReportSchedule(
            group_id=body.group_id,
            send_hour=body.send_hour,
            send_minute=body.send_minute,
            is_active=body.is_active,
        )
        db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/schedule/{group_id}")
def delete_schedule(
    group_id:     int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(AdminOrTeacher),
):
    _check_group_access(current_user, group_id, db)
    s = db.query(GroupReportSchedule).filter(GroupReportSchedule.group_id == group_id).first()
    if s:
        db.delete(s)
        db.commit()
    return {"ok": True}
