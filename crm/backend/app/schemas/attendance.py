from pydantic import BaseModel
from datetime import date
from typing import Optional, List
from app.models.attendance import AttendanceStatus


class AttendanceMarkItem(BaseModel):
    student_id: int
    status: AttendanceStatus
    late_minutes: Optional[int] = None
    note: Optional[str] = None


class AttendanceMark(BaseModel):
    group_id: int
    date: date
    records: List[AttendanceMarkItem]


class AttendanceOut(BaseModel):
    id: int
    student_id: int
    student_name: str
    group_id: int
    date: date
    status: AttendanceStatus
    late_minutes: Optional[int] = None
    note: Optional[str] = None

    model_config = {"from_attributes": True}


class AttendanceDaySummary(BaseModel):
    date: date
    present: int
    absent: int
    late: int
    total: int
