from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, ForeignKey, func, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    telegram_group_link = Column(String(255), nullable=True)
    schedule = Column(JSON, nullable=True)  # {"monday": "09:00-11:00", ...}
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    teacher = relationship("User", foreign_keys=[teacher_id])
    students = relationship("StudentProfile", back_populates="group")
    tests = relationship("Test", back_populates="group")
