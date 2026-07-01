from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Enum, func
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent  = "absent"
    late    = "late"
    excused = "excused"


class Attendance(Base):
    __tablename__ = "attendances"

    id           = Column(Integer, primary_key=True, index=True)
    student_id   = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    group_id     = Column(Integer, ForeignKey("groups.id",           ondelete="CASCADE"), nullable=False)
    date         = Column(Date, nullable=False)
    status       = Column(Enum(AttendanceStatus, name="attendancestatus"), nullable=False, default=AttendanceStatus.present)
    late_minutes = Column(Integer, nullable=True)
    note         = Column(String(500), nullable=True)
    module_id    = Column(Integer, ForeignKey("modules.id", ondelete="SET NULL"), nullable=True)
    topic_id     = Column(Integer, ForeignKey("topics.id",  ondelete="SET NULL"), nullable=True)
    created_at   = Column(DateTime, server_default=func.now())

    student = relationship("StudentProfile")
    group   = relationship("Group")
    module  = relationship("Module",  foreign_keys=[module_id])
    topic   = relationship("Topic",   foreign_keys=[topic_id])
