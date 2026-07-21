from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import UserOut
from app.utils.auth import require_roles, hash_password
from app.utils.audit import log_action

router = APIRouter(prefix="/api/superadmin", tags=["superadmin"])

SuperAdminOnly = require_roles(UserRole.super_admin)

ALLOWED_MANAGED_ROLES = {UserRole.admin, UserRole.teacher, UserRole.student}

ALL_MODULES = [
    "students", "teachers", "groups", "attendance",
    "payments", "assessments", "tests", "results",
    "timetable", "rooms", "materials",
]


class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    username: str
    password: str
    phone: Optional[str] = None
    role: UserRole = UserRole.admin


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class PermissionsUpdate(BaseModel):
    permissions: Optional[List[str]] = None  # null = barcha ruxsatlar


@router.get("/users", response_model=List[UserOut])
def list_users(
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(SuperAdminOnly),
):
    q = db.query(User).filter(User.role != UserRole.super_admin)
    if role:
        try:
            r = UserRole(role)
            q = q.filter(User.role == r)
        except ValueError:
            raise HTTPException(400, "Noto'g'ri rol")
    return q.order_by(User.created_at.desc()).all()


@router.post("/users", response_model=UserOut)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(SuperAdminOnly),
):
    if body.role == UserRole.super_admin:
        raise HTTPException(400, "Super admin yaratib bo'lmaydi")
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(400, "Bu email allaqachon mavjud")
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(400, "Bu username band")
    if body.phone and db.query(User).filter(User.phone == body.phone).first():
        raise HTTPException(400, "Bu telefon raqami band")

    user = User(
        first_name=body.first_name,
        last_name=body.last_name,
        email=body.email,
        username=body.username,
        phone=body.phone or None,
        password_hash=hash_password(body.password),
        role=body.role,
    )
    db.add(user)
    db.flush()
    log_action(db, _, "create", "superadmin", "user", user.id, f"{user.first_name} {user.last_name}",
               details={"role": body.role.value})
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(SuperAdminOnly),
):
    user = db.query(User).filter(User.id == user_id, User.role != UserRole.super_admin).first()
    if not user:
        raise HTTPException(404, "Foydalanuvchi topilmadi")

    if body.first_name is not None: user.first_name = body.first_name
    if body.last_name  is not None: user.last_name  = body.last_name
    if body.email      is not None:
        if db.query(User).filter(User.email == body.email, User.id != user_id).first():
            raise HTTPException(400, "Bu email allaqachon mavjud")
        user.email = body.email
    if body.username   is not None:
        if db.query(User).filter(User.username == body.username, User.id != user_id).first():
            raise HTTPException(400, "Bu username band")
        user.username = body.username
    if body.phone      is not None:
        user.phone = body.phone or None
    if body.password   is not None:
        user.password_hash = hash_password(body.password)
    if body.is_active  is not None:
        user.is_active = body.is_active

    log_action(db, _, "update", "superadmin", "user", user.id, f"{user.first_name} {user.last_name}")
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}/permissions", response_model=UserOut)
def set_permissions(
    user_id: int,
    body: PermissionsUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(SuperAdminOnly),
):
    user = db.query(User).filter(User.id == user_id, User.role == UserRole.admin).first()
    if not user:
        raise HTTPException(404, "Admin topilmadi")

    if body.permissions is None:
        user.permissions = None  # barcha ruxsatlar
    else:
        user.permissions = [m for m in body.permissions if m in ALL_MODULES]

    log_action(db, _, "permission_change", "superadmin", "user", user.id, f"{user.first_name} {user.last_name}",
               details={"permissions": user.permissions})
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(SuperAdminOnly),
):
    user = db.query(User).filter(User.id == user_id, User.role != UserRole.super_admin).first()
    if not user:
        raise HTTPException(404, "Foydalanuvchi topilmadi")
    log_action(db, _, "delete", "superadmin", "user", user.id, f"{user.first_name} {user.last_name}")
    db.delete(user)
    db.commit()
    return {"ok": True}


@router.get("/modules")
def get_modules(_: User = Depends(SuperAdminOnly)):
    labels = {
        "students":    "O'quvchilar",
        "teachers":    "O'qituvchilar",
        "groups":      "Guruhlar",
        "attendance":  "Yo'qlama",
        "payments":    "To'lovlar",
        "assessments": "Baholash",
        "tests":       "Testlar",
        "results":     "Natijalar",
        "timetable":   "Dars Jadvali",
        "rooms":       "O'quv xona",
        "materials":   "O'quv materiallari",
    }
    return [{"key": k, "label": v} for k, v in labels.items()]
