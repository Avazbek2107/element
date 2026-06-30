from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from app.database import Base


class Room(Base):
    __tablename__ = "rooms"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(100), nullable=False)
    capacity    = Column(Integer, nullable=True)
    description = Column(String(500), nullable=True)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime, server_default=func.now())
