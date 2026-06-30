import os
import random
import string

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.user import User, UserRole
from app.models.student import StudentProfile
from datetime import datetime
from app.models.test import Test, TestQuestion, TestResult, TestStatus
from app.utils.auth import require_roles
from app.utils.notify import send_telegram_message

router = APIRouter(prefix="/api/telegram", tags=["telegram"])

AdminOrTeacher = require_roles(UserRole.admin, UserRole.teacher)

GRADES = [(90, "A'lo"), (75, "Yaxshi"), (50, "O'rtacha"), (0, "Yomon")]


def _grade(pct: float) -> str:
    for threshold, label in GRADES:
        if pct >= threshold:
            return label
    return "Yomon"


def _generate_code(db: Session) -> str:
    alphabet = string.ascii_uppercase + string.digits
    while True:
        code = "".join(random.choices(alphabet, k=8))
        used_parent  = db.query(StudentProfile).filter(StudentProfile.link_code == code).first()
        used_student = db.query(StudentProfile).filter(StudentProfile.student_link_code == code).first()
        if not used_parent and not used_student:
            return code


def _check_bot_secret(x_bot_secret: Optional[str]):
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    if not token or x_bot_secret != token:
        raise HTTPException(status_code=401, detail="Ruxsat yo'q")


def _deep_link(code: str) -> Optional[str]:
    bot_username = os.getenv("TELEGRAM_BOT_USERNAME", "").strip()
    return f"https://t.me/{bot_username}?start={code}" if bot_username else None


# ── Ota-ona kodi ─────────────────────────────────────────────────────

@router.get("/link-code/{student_id}")
def get_parent_link_code(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="O'quvchi topilmadi")
    if not profile.link_code:
        profile.link_code = _generate_code(db)
        db.commit()
        db.refresh(profile)
    return {
        "link_code": profile.link_code,
        "deep_link": _deep_link(profile.link_code),
        "is_linked": bool(profile.parent_telegram_id),
    }


# ── O'quvchi kodi ────────────────────────────────────────────────────

@router.get("/student-link-code/{student_id}")
def get_student_link_code(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="O'quvchi topilmadi")
    if not profile.student_link_code:
        profile.student_link_code = _generate_code(db)
        db.commit()
        db.refresh(profile)
    return {
        "student_link_code": profile.student_link_code,
        "deep_link": _deep_link(profile.student_link_code),
        "is_linked": bool(profile.student_telegram_id),
    }


# ── Bog'lash (ota-ona va o'quvchi bir endpointdan) ───────────────────

class LinkByCodeReq(BaseModel):
    code: str
    chat_id: str


@router.post("/link-by-code")
def link_by_code(
    body: LinkByCodeReq,
    db: Session = Depends(get_db),
    x_bot_secret: Optional[str] = Header(None),
):
    _check_bot_secret(x_bot_secret)
    code = body.code.strip().upper()

    # Avval ota-ona kodini qidirish
    profile = db.query(StudentProfile).filter(StudentProfile.link_code == code).first()
    if profile:
        profile.parent_telegram_id = str(body.chat_id)
        db.commit()
        return {"type": "parent", "student_name": f"{profile.user.first_name} {profile.user.last_name}"}

    # Keyin o'quvchi kodini qidirish
    profile = db.query(StudentProfile).filter(StudentProfile.student_link_code == code).first()
    if profile:
        profile.student_telegram_id = str(body.chat_id)
        db.commit()
        return {"type": "student", "student_name": f"{profile.user.first_name} {profile.user.last_name}"}

    raise HTTPException(status_code=404, detail="Kod topilmadi")


# ── Qog'oz test natijasini topshirish ────────────────────────────────

class SubmitTestReq(BaseModel):
    chat_id: str
    test_id: int
    answers: str   # "ABCDA" formatida


@router.post("/submit-test")
def submit_test_via_bot(
    body: SubmitTestReq,
    db: Session = Depends(get_db),
    x_bot_secret: Optional[str] = Header(None),
):
    _check_bot_secret(x_bot_secret)

    profile = db.query(StudentProfile).filter(
        StudentProfile.student_telegram_id == str(body.chat_id)
    ).first()
    if not profile:
        raise HTTPException(status_code=403, detail="Telegram hisobingiz hali bog'lanmagan. Avval kodni yuboring.")

    test = db.query(Test).filter(Test.id == body.test_id, Test.is_published == True).first()
    if not test:
        raise HTTPException(status_code=404, detail=f"Test #{body.test_id} topilmadi yoki nashr etilmagan.")

    answers = body.answers.strip().upper().replace(" ", "")

    if test.answer_key:
        # Qog'oz test — answer_key dan tekshirish
        key = test.answer_key.upper()
        if len(answers) != len(key):
            raise HTTPException(
                status_code=400,
                detail=f"Savollar soni: {len(key)}, yuborilgan javoblar soni: {len(answers)}. Mos kelmadi."
            )
        correct = sum(1 for a, k in zip(answers, key) if a == k)
        total = len(key)
        total_points = correct
    else:
        questions = (
            db.query(TestQuestion)
            .filter(TestQuestion.test_id == body.test_id)
            .order_by(TestQuestion.id)
            .all()
        )
        if not questions:
            raise HTTPException(status_code=400, detail="Testda savollar yo'q.")
        if len(answers) != len(questions):
            raise HTTPException(
                status_code=400,
                detail=f"Savollar soni: {len(questions)}, yuborilgan javoblar soni: {len(answers)}. Mos kelmadi."
            )
        correct = 0
        total_points = 0
        for i, q in enumerate(questions):
            if answers[i] == q.correct_answer.upper():
                correct += 1
                total_points += q.points
        total = len(questions)
    percentage = round(correct / total * 100, 2) if total > 0 else 0

    result = TestResult(
        test_id=body.test_id,
        student_id=profile.id,
        correct_count=correct,
        total_questions=total,
        percentage=percentage,
        total_points=total_points,
        answers={str(i + 1): answers[i] for i in range(len(answers))},
        submitted_at=datetime.utcnow(),
        status=TestStatus.submitted,
    )
    db.add(result)
    db.commit()

    if profile.parent_telegram_id:
        send_telegram_message(
            profile.parent_telegram_id,
            f"📝 {profile.user.first_name} {profile.user.last_name} \"{test.title}\" testini "
            f"topshirdi: {correct}/{total} to'g'ri ({percentage}%).",
        )

    return {
        "student_name": f"{profile.user.first_name} {profile.user.last_name}",
        "test_title": test.title,
        "correct": correct,
        "total": total,
        "percentage": percentage,
        "grade": _grade(percentage),
    }
