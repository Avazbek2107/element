from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class TopicCreate(BaseModel):
    title: str
    content: Optional[str] = None
    order: Optional[int] = 0


class TopicUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    order: Optional[int] = None


class TopicOut(BaseModel):
    id: int
    module_id: int
    title: str
    content: Optional[str] = None
    order: int
    created_at: datetime

    class Config:
        from_attributes = True


class ModuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    order: Optional[int] = 0


class ModuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    order: Optional[int] = None


class ModuleOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    order: int
    created_at: datetime
    topics: List[TopicOut] = []

    class Config:
        from_attributes = True
