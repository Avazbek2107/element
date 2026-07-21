from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class Message(Base):
    __tablename__ = "messages"

    id                  = Column(Integer, primary_key=True, index=True)
    sender_id           = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    recipient_user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    recipient_student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=True)
    channel             = Column(String(20), nullable=False)   # internal | telegram | sms
    body                = Column(String(2000), nullable=False)
    status              = Column(String(20), nullable=False, default="sent")  # sent | failed | no_contact
    is_read             = Column(Boolean, nullable=False, default=False)
    created_at          = Column(DateTime, server_default=func.now())

    sender            = relationship("User", foreign_keys=[sender_id])
    recipient_user    = relationship("User", foreign_keys=[recipient_user_id])
    recipient_student = relationship("StudentProfile", foreign_keys=[recipient_student_id])
