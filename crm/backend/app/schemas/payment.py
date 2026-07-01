from pydantic import BaseModel
from datetime import date
from typing import Optional, List
from app.models.payment import PaymentStatus


class PaymentCreate(BaseModel):
    student_id: int
    group_id:   Optional[int] = None
    amount:     float
    month:      int
    year:       int
    note:       Optional[str] = None


class PaymentBulkCreate(BaseModel):
    group_id: int
    amount:   float
    month:    int
    year:     int


class PaymentUpdate(BaseModel):
    paid_amount:  Optional[float] = None
    status:       Optional[PaymentStatus] = None
    payment_date: Optional[date] = None
    note:         Optional[str] = None


class PaymentOut(BaseModel):
    id:           int
    student_id:   int
    student_name: str
    group_id:     Optional[int]
    group_name:   Optional[str]
    amount:       float
    paid_amount:  float
    month:        int
    year:         int
    status:       PaymentStatus
    payment_date: Optional[date]
    note:         Optional[str]

    model_config = {"from_attributes": True}


class PaymentSummary(BaseModel):
    total_students: int
    paid:           int
    partial:        int
    pending:        int
    total_amount:   float
    collected:      float
    remaining:      float
