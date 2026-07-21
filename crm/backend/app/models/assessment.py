from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Boolean, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.database import Base


class Assessment(Base):
    __tablename__ = "assessments"
    __table_args__ = (
        UniqueConstraint("student_id", "group_id", "date", name="ix_assessments_student_group_date"),
    )

    id             = Column(Integer, primary_key=True, index=True)
    student_id     = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    group_id       = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    date           = Column(Date, nullable=False)
    qa_correct     = Column(Integer, nullable=True)
    qa_total       = Column(Integer, nullable=True)
    test_correct   = Column(Integer, nullable=True)
    test_total     = Column(Integer, nullable=True)
    activity_score = Column(Integer, nullable=True)
    note           = Column(String(500), nullable=True)
    created_at     = Column(DateTime, server_default=func.now())

    student = relationship("StudentProfile")
    group   = relationship("Group")


class GroupReportSchedule(Base):
    __tablename__ = "group_report_schedules"

    id             = Column(Integer, primary_key=True, index=True)
    group_id       = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, unique=True)
    send_hour      = Column(Integer, nullable=False)
    send_minute    = Column(Integer, nullable=False, default=0)
    is_active      = Column(Boolean, default=True)
    last_sent_date = Column(Date, nullable=True)

    group = relationship("Group")
