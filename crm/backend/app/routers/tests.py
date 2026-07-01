from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import io
from app.database import get_db
from app.models.user import User, UserRole
from app.models.test import Test, TestQuestion, TestResult, TestStatus
from app.models.student import StudentProfile
from app.schemas.test import (
    TestCreate, TestUpdate, TestOut,
    QuestionCreate, QuestionOut, QuestionWithAnswer,
    TestSubmit, TestResultOut,
)
from app.utils.auth import get_current_user, require_roles
from app.utils.parser import parse_docx, parse_pdf
from app.utils.notify import send_telegram_message, send_test_notification
from app.models.group import Group

router = APIRouter(prefix="/api/tests", tags=["tests"])

AdminOrTeacher = require_roles(UserRole.admin, UserRole.teacher)

GRADES = [(90, "A'lo"), (75, "Yaxshi"), (50, "O'rtacha"), (0, "Yomon")]


def _grade(percentage: float) -> str:
    for threshold, label in GRADES:
        if percentage >= threshold:
            return label
    return "Yomon"


def _build_result_out(result: TestResult) -> TestResultOut:
    return TestResultOut(
        id=result.id,
        test_id=result.test_id,
        test_title=result.test.title if result.test else "",
        student_id=result.student_id,
        correct_count=result.correct_count,
        total_questions=result.total_questions,
        percentage=float(result.percentage),
        total_points=result.total_points,
        grade=_grade(float(result.percentage)),
        started_at=result.started_at,
        submitted_at=result.submitted_at,
        status=result.status,
        answers=result.answers,
    )


@router.get("", response_model=List[TestOut])
def list_tests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role in (UserRole.admin, UserRole.teacher):
        tests = db.query(Test).all()
    else:
        # O'quvchi faqat o'z guruhiga tegishli, nashr etilgan testlarni ko'radi
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if not profile or not profile.group_id:
            return []
        tests = db.query(Test).filter(
            Test.group_id == profile.group_id,
            Test.is_published == True,
        ).all()
    return tests


@router.post("", response_model=TestOut, status_code=status.HTTP_201_CREATED)
def create_test(
    body: TestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    answer_key = body.answer_key.strip().upper() if body.answer_key else None
    is_paper = bool(answer_key)

    test = Test(
        title=body.title,
        description=body.description,
        group_id=body.group_id,
        teacher_id=current_user.id,
        test_type=body.test_type,
        duration_minutes=body.duration_minutes,
        passing_score=body.passing_score,
        answer_key=answer_key,
        start_date=body.start_date,
        end_date=body.end_date,
        total_questions=len(answer_key) if is_paper else len(body.questions),
        is_published=is_paper,   # Qog'oz testlar avtomatik nashr etiladi
    )
    db.add(test)
    db.flush()

    for i, q in enumerate(body.questions):
        question = TestQuestion(
            test_id=test.id,
            question_text=q.question_text,
            option_a=q.option_a,
            option_b=q.option_b,
            option_c=q.option_c,
            option_d=q.option_d,
            correct_answer=q.correct_answer,
            points=q.points,
            question_order=q.question_order or i + 1,
        )
        db.add(question)

    db.commit()
    db.refresh(test)

    if is_paper and test.group_id:
        _notify_group_students(db, test)

    return test


@router.get("/{test_id}", response_model=TestOut)
def get_test(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test topilmadi")
    return test


@router.put("/{test_id}", response_model=TestOut)
def update_test(
    test_id: int,
    body: TestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test topilmadi")
    for key, value in body.model_dump(exclude_none=True).items():
        setattr(test, key, value)
    db.commit()
    db.refresh(test)
    return test


@router.delete("/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_test(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test topilmadi")
    db.delete(test)
    db.commit()


def _notify_group_students(db, test):
    if not test.group_id:
        return
    group = db.query(Group).filter(Group.id == test.group_id).first()
    group_name = group.name if group else ""
    q_count = len(test.answer_key) if test.answer_key else db.query(TestQuestion).filter(TestQuestion.test_id == test.id).count()
    students = db.query(StudentProfile).filter(
        StudentProfile.group_id == test.group_id,
        StudentProfile.student_telegram_id.isnot(None),
    ).all()
    for s in students:
        send_test_notification(s.student_telegram_id, test.id, test.title, group_name, q_count)


@router.post("/{test_id}/publish")
def publish_test(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test topilmadi")
    test.is_published = True
    db.commit()
    _notify_group_students(db, test)
    return {"message": "Test nashr etildi"}


@router.get("/{test_id}/questions", response_model=List[QuestionOut])
def get_questions(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test topilmadi")
    # O'quvchiga to'g'ri javobni ko'rsatmaymiz
    questions = db.query(TestQuestion).filter(
        TestQuestion.test_id == test_id
    ).order_by(TestQuestion.question_order).all()
    return questions


@router.post("/{test_id}/questions", response_model=QuestionOut, status_code=status.HTTP_201_CREATED)
def add_question(
    test_id: int,
    body: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test topilmadi")
    question = TestQuestion(test_id=test_id, **body.model_dump())
    db.add(question)
    test.total_questions += 1
    db.commit()
    db.refresh(question)
    return question


@router.post("/{test_id}/start")
def start_test(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    test = db.query(Test).filter(Test.id == test_id, Test.is_published == True).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test topilmadi yoki nashr etilmagan")

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=403, detail="Faqat o'quvchilar test topshira oladi")

    existing = db.query(TestResult).filter(
        TestResult.test_id == test_id,
        TestResult.student_id == profile.id,
        TestResult.status == TestStatus.submitted,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Siz bu testni allaqachon topshirgansiz")

    # Draft holati bormi
    draft = db.query(TestResult).filter(
        TestResult.test_id == test_id,
        TestResult.student_id == profile.id,
        TestResult.status == TestStatus.draft,
    ).first()
    if draft:
        # Vaqt tugaganmi tekshir
        if draft.deadline_at and datetime.utcnow() > draft.deadline_at:
            draft.status = TestStatus.expired
            db.commit()
            raise HTTPException(status_code=400, detail="Test vaqti tugagan")
        return {
            "result_id": draft.id,
            "started_at": draft.started_at,
            "deadline_at": draft.deadline_at,
            "remaining_seconds": int((draft.deadline_at - datetime.utcnow()).total_seconds()),
        }

    now = datetime.utcnow()
    result = TestResult(
        student_id=profile.id,
        test_id=test_id,
        total_questions=test.total_questions,
        started_at=now,
        deadline_at=now + timedelta(minutes=test.duration_minutes),
        status=TestStatus.draft,
        answers={},
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return {
        "result_id": result.id,
        "started_at": result.started_at,
        "deadline_at": result.deadline_at,
        "remaining_seconds": test.duration_minutes * 60,
    }


@router.post("/{test_id}/submit", response_model=TestResultOut)
def submit_test(
    test_id: int,
    body: TestSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=403, detail="Faqat o'quvchilar test topshira oladi")

    result = db.query(TestResult).filter(
        TestResult.test_id == test_id,
        TestResult.student_id == profile.id,
        TestResult.status == TestStatus.draft,
    ).first()
    if not result:
        raise HTTPException(status_code=404, detail="Faol test sessiyasi topilmadi")

    # Serverda vaqtni tekshirish
    if result.deadline_at and datetime.utcnow() > result.deadline_at:
        result.status = TestStatus.expired
        db.commit()
        raise HTTPException(status_code=400, detail="Test vaqti tugagan")

    questions = {q.id: q for q in db.query(TestQuestion).filter(TestQuestion.test_id == test_id).all()}
    answers_map = {a.question_id: a.answer for a in body.answers}

    correct = 0
    total_points = 0
    for q_id, question in questions.items():
        given = answers_map.get(q_id)
        if given and given == question.correct_answer:
            correct += 1
            total_points += question.points

    total = len(questions)
    percentage = round((correct / total * 100) if total > 0 else 0, 2)

    result.correct_count = correct
    result.total_questions = total
    result.percentage = percentage
    result.total_points = total_points
    result.answers = {str(k): v for k, v in answers_map.items()}
    result.submitted_at = datetime.utcnow()
    result.status = TestStatus.submitted

    db.commit()
    db.refresh(result)

    if profile.parent_telegram_id:
        test = db.query(Test).filter(Test.id == test_id).first()
        student_name = f"{profile.user.first_name} {profile.user.last_name}"
        send_telegram_message(
            profile.parent_telegram_id,
            f"📝 {student_name} \"{test.title if test else ''}\" testini topshirdi: "
            f"{correct}/{total} to'g'ri ({percentage}%).",
        )

    return _build_result_out(result)


@router.get("/{test_id}/results", response_model=List[TestResultOut])
def get_results(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    results = db.query(TestResult).filter(
        TestResult.test_id == test_id,
        TestResult.status == TestStatus.submitted,
    ).all()
    return [_build_result_out(r) for r in results]


@router.get("/{test_id}/questions-edit", response_model=List[QuestionWithAnswer])
def get_questions_for_edit(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test topilmadi")
    return db.query(TestQuestion).filter(
        TestQuestion.test_id == test_id
    ).order_by(TestQuestion.question_order).all()


@router.put("/{test_id}/full", response_model=TestOut)
def update_test_full(
    test_id: int,
    body: TestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test topilmadi")

    test.title          = body.title
    test.description    = body.description
    test.group_id       = body.group_id
    test.test_type      = body.test_type
    test.duration_minutes = body.duration_minutes
    test.passing_score  = body.passing_score
    test.start_date     = body.start_date
    test.end_date       = body.end_date
    test.total_questions = len(body.questions)

    db.query(TestQuestion).filter(TestQuestion.test_id == test_id).delete()
    for i, q in enumerate(body.questions):
        db.add(TestQuestion(
            test_id=test.id,
            question_text=q.question_text,
            option_a=q.option_a, option_b=q.option_b,
            option_c=q.option_c, option_d=q.option_d,
            correct_answer=q.correct_answer,
            points=q.points,
            question_order=q.question_order or i + 1,
        ))

    db.commit()
    db.refresh(test)
    return test


@router.post("/parse-file")
async def parse_file(
    file: UploadFile = File(...),
    current_user: User = Depends(AdminOrTeacher),
):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ("docx", "pdf"):
        raise HTTPException(status_code=400, detail="Faqat .docx yoki .pdf fayl yuklang")

    content = await file.read()
    buf = io.BytesIO(content)

    try:
        if ext == "docx":
            questions = parse_docx(buf)
        else:
            questions = parse_pdf(buf)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Faylni o'qishda xato: {e}")

    if not questions:
        raise HTTPException(
            status_code=422,
            detail="Savollar topilmadi. Fayl formatini tekshiring."
        )

    return {"questions": questions, "total": len(questions)}
