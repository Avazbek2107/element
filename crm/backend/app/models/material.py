from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Module(Base):
    __tablename__ = "modules"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    order       = Column(Integer, default=0)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime, server_default=func.now())

    topics = relationship(
        "Topic",
        back_populates="module",
        cascade="all, delete-orphan",
        order_by="Topic.order, Topic.id",
    )


class Topic(Base):
    __tablename__ = "topics"

    id        = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    title     = Column(String(300), nullable=False)
    content   = Column(Text, nullable=True)
    order     = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    module = relationship("Module", back_populates="topics")
