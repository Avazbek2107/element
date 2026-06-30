from pydantic import BaseModel
from datetime import date
from typing import Optional, Any


class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    teacher_id: Optional[int] = None
    telegram_group_link: Optional[str] = None
    schedule: Optional[dict] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    teacher_id: Optional[int] = None
    telegram_group_link: Optional[str] = None
    schedule: Optional[dict] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None


class GroupOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    teacher_id: Optional[int]
    teacher_name: Optional[str] = None
    telegram_group_link: Optional[str]
    schedule: Optional[Any]
    start_date: Optional[date]
    end_date: Optional[date]
    is_active: bool
    student_count: int = 0

    class Config:
        from_attributes = True
