from sqlalchemy import Column, Integer, String, Boolean, DateTime, func, Enum, JSON
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    super_admin = "super_admin"
    admin = "admin"
    teacher = "teacher"
    student = "student"
    parent = "parent"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    phone = Column(String(20), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True, index=True)
    permissions = Column(JSON, nullable=True)  # admin uchun ruxsat ro'yxati; null = hammasi
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
