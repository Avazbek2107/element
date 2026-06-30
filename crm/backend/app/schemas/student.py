from pydantic import BaseModel, EmailStr
from datetime import date, datetime
from typing import Optional


class StudentCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    group_id: Optional[int] = None
    birth_date: Optional[date] = None
    parent_phone: Optional[str] = None
    parent_telegram_id: Optional[str] = None
    address: Optional[str] = None
    course_start_date: Optional[date] = None
    course_end_date: Optional[date] = None


class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    group_id: Optional[int] = None
    birth_date: Optional[date] = None
    parent_phone: Optional[str] = None
    parent_telegram_id: Optional[str] = None
    student_telegram_id: Optional[str] = None
    address: Optional[str] = None
    course_start_date: Optional[date] = None
    course_end_date: Optional[date] = None


class StudentOut(BaseModel):
    id: int
    user_id: int
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]
    group_id: Optional[int]
    group_name: Optional[str] = None
    birth_date: Optional[date]
    parent_phone: Optional[str]
    address: Optional[str]
    enrolled_date: Optional[date]
    course_start_date: Optional[date]
    course_end_date: Optional[date]
    is_active: bool

    class Config:
        from_attributes = True
