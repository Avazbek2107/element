from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User, UserRole
from app.models.test import TestResult, TestStatus
from app.models.student import StudentProfile
from app.schemas.test import TestResultOut
from app.utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/api/results", tags=["results"])

GRADES = [(90, "A'lo"), (75, "Yaxshi"), (50, "O'rtacha"), (0, "Yomon")]


def _grade(pct: float) -> str:
    for threshold, label in GRADES:
        if pct >= threshold:
            return label
    return "Yomon"


def _build(result: TestResult) -> TestResultOut:
    student_name = ""
    if result.student and result.student.user:
        u = result.student.user
        student_name = f"{u.last_name} {u.first_name}"

    return TestResultOut(
        id=result.id,
        test_id=result.test_id,
        test_title=result.test.title if result.test else "",
        student_id=result.student_id,
        student_name=student_name,
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


class ResultsPage(BaseModel):
    items: List[TestResultOut]
    total: int


@router.get("/my", response_model=List[TestResultOut])
def my_results(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        return []
    results = (
        db.query(TestResult)
        .filter(TestResult.student_id == profile.id, TestResult.status == TestStatus.submitted)
        .order_by(TestResult.submitted_at.desc())
        .all()
    )
    return [_build(r) for r in results]


@router.get("", response_model=ResultsPage)
def all_results(
    test_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.teacher)),
):
    q = db.query(TestResult).filter(TestResult.status == TestStatus.submitted)
    if test_id:
        q = q.filter(TestResult.test_id == test_id)
    total = q.count()
    results = q.order_by(TestResult.submitted_at.desc()).offset(skip).limit(limit).all()
    return {"items": [_build(r) for r in results], "total": total}
