from pydantic import BaseModel
from typing import Optional


class RoomCreate(BaseModel):
    name: str
    capacity: Optional[int] = None
    description: Optional[str] = None


class RoomUpdate(BaseModel):
    name: Optional[str] = None
    capacity: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class RoomOut(BaseModel):
    id: int
    name: str
    capacity: Optional[int] = None
    description: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True
