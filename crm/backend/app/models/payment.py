from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Enum, Numeric, Index, func
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    paid    = "paid"
    partial = "partial"


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        Index("ix_payments_month_year", "month", "year"),
    )

    id           = Column(Integer, primary_key=True, index=True)
    student_id   = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    group_id     = Column(Integer, ForeignKey("groups.id", ondelete="SET NULL"), nullable=True)
    amount       = Column(Numeric(12, 0), nullable=False)
    paid_amount  = Column(Numeric(12, 0), nullable=False, default=0)
    month        = Column(Integer, nullable=False)
    year         = Column(Integer, nullable=False)
    status       = Column(Enum(PaymentStatus, name="paymentstatus"), nullable=False, default=PaymentStatus.pending)
    payment_date = Column(Date, nullable=True)
    note         = Column(String(500), nullable=True)
    last_reminder_at = Column(Date, nullable=True)
    created_at   = Column(DateTime, server_default=func.now())

    student = relationship("StudentProfile")
    group   = relationship("Group")
