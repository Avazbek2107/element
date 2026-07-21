from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="SET NULL"), nullable=True, index=True)
    birth_date = Column(Date, nullable=True)
    parent_phone = Column(String(20), nullable=True)
    parent_telegram_id = Column(String(50), nullable=True)
    student_telegram_id = Column(String(50), nullable=True)
    address = Column(String(300), nullable=True)
    middle_name = Column(String(50), nullable=True)
    gender = Column(String(6), nullable=True)  # male | female
    doc_type = Column(String(20), nullable=True)    # passport | birth_cert
    doc_series = Column(String(30), nullable=True)
    link_code         = Column(String(12), unique=True, nullable=True)  # Ota-ona Telegram bog'lash kodi
    student_link_code = Column(String(12), unique=True, nullable=True)  # O'quvchi Telegram bog'lash kodi
    avatar_url = Column(String(255), nullable=True)
    enrolled_date = Column(Date, server_default=func.current_date())
    course_start_date = Column(Date, nullable=True)
    course_end_date = Column(Date, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_id])
    group = relationship("Group", back_populates="students")
    test_results = relationship("TestResult", back_populates="student")


# Orqaga moslik uchun alias
Student = StudentProfile
