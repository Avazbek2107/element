from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional, List, Any
from app.models.test import TestType, TestStatus


class QuestionCreate(BaseModel):
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str
    points: int = 1
    question_order: Optional[int] = None

    @field_validator("correct_answer")
    @classmethod
    def validate_answer(cls, v):
        if v.upper() not in ("A", "B", "C", "D"):
            raise ValueError("Javob A, B, C yoki D bo'lishi kerak")
        return v.upper()


class QuestionOut(BaseModel):
    id: int
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    points: int
    question_order: Optional[int]

    class Config:
        from_attributes = True


class QuestionWithAnswer(QuestionOut):
    correct_answer: str


class TestCreate(BaseModel):
    title: str
    description: Optional[str] = None
    group_id: Optional[int] = None
    test_type: TestType = TestType.practice
    duration_minutes: int = 30
    passing_score: int = 50
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    questions: List[QuestionCreate] = []


class TestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    group_id: Optional[int] = None
    test_type: Optional[TestType] = None
    duration_minutes: Optional[int] = None
    passing_score: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class TestOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    group_id: Optional[int]
    teacher_id: Optional[int]
    test_type: TestType
    duration_minutes: int
    total_questions: int
    passing_score: int
    is_published: bool
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class SubmitAnswer(BaseModel):
    question_id: int
    answer: str

    @field_validator("answer")
    @classmethod
    def validate_answer(cls, v):
        if v.upper() not in ("A", "B", "C", "D"):
            raise ValueError("Javob A, B, C yoki D bo'lishi kerak")
        return v.upper()


class TestSubmit(BaseModel):
    answers: List[SubmitAnswer]


class TestResultOut(BaseModel):
    id: int
    test_id: int
    test_title: str = ""
    student_id: int
    student_name: str = ""
    correct_count: int
    total_questions: int
    percentage: float
    total_points: int
    grade: str = ""
    started_at: Optional[datetime]
    submitted_at: Optional[datetime]
    status: TestStatus
    answers: Optional[Any]

    class Config:
        from_attributes = True
