from pydantic import BaseModel
from datetime import date
from typing import Optional, List


class AssessmentItem(BaseModel):
    student_id:     int
    qa_correct:     Optional[int] = None
    qa_total:       Optional[int] = None
    test_correct:   Optional[int] = None
    test_total:     Optional[int] = None
    activity_score: Optional[int] = None
    note:           Optional[str] = None


class AssessmentBulkSave(BaseModel):
    group_id: int
    date:     date
    items:    List[AssessmentItem]


class AssessmentOut(BaseModel):
    id:             int
    student_id:     int
    student_name:   str
    group_id:       int
    date:           date
    qa_correct:     Optional[int]
    qa_total:       Optional[int]
    test_correct:   Optional[int]
    test_total:     Optional[int]
    activity_score: Optional[int]
    note:           Optional[str]

    model_config = {"from_attributes": True}


class ScheduleCreate(BaseModel):
    group_id:    int
    send_hour:   int
    send_minute: int = 0
    is_active:   bool = True


class ScheduleOut(BaseModel):
    id:          int
    group_id:    int
    send_hour:   int
    send_minute: int
    is_active:   bool

    model_config = {"from_attributes": True}
