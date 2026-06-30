from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func, JSON, Enum, Numeric
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class TestType(str, enum.Enum):
    weekly = "weekly"
    monthly = "monthly"
    final = "final"
    practice = "practice"


class TestStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    expired = "expired"


class Test(Base):
    __tablename__ = "tests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String(1000), nullable=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    test_type = Column(Enum(TestType), default=TestType.practice)
    duration_minutes = Column(Integer, default=30)
    total_questions = Column(Integer, default=0)
    passing_score = Column(Integer, default=50)
    is_published = Column(Boolean, default=False)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    group = relationship("Group", back_populates="tests")
    teacher = relationship("User", foreign_keys=[teacher_id])
    questions = relationship("TestQuestion", back_populates="test", cascade="all, delete-orphan")
    results = relationship("TestResult", back_populates="test", cascade="all, delete-orphan")


class TestQuestion(Base):
    __tablename__ = "test_questions"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("tests.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(String, nullable=False)
    option_a = Column(String, nullable=False)
    option_b = Column(String, nullable=False)
    option_c = Column(String, nullable=False)
    option_d = Column(String, nullable=False)
    correct_answer = Column(String(1), nullable=False)  # A/B/C/D
    points = Column(Integer, default=1)
    question_order = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    test = relationship("Test", back_populates="questions")


class TestResult(Base):
    __tablename__ = "test_results"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    test_id = Column(Integer, ForeignKey("tests.id", ondelete="CASCADE"), nullable=False)
    correct_count = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    percentage = Column(Numeric(5, 2), default=0)
    total_points = Column(Integer, default=0)
    answers = Column(JSON, default={})  # {"question_id": "A", ...}
    started_at = Column(DateTime, nullable=True)
    deadline_at = Column(DateTime, nullable=True)  # server-side taymer
    submitted_at = Column(DateTime, nullable=True)
    status = Column(Enum(TestStatus), default=TestStatus.draft)

    student = relationship("StudentProfile", back_populates="test_results")
    test = relationship("Test", back_populates="results")
