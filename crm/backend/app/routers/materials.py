from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User, UserRole
from app.models.material import Module, Topic
from app.schemas.material import (
    ModuleCreate, ModuleUpdate, ModuleOut,
    TopicCreate, TopicUpdate, TopicOut,
)
from app.utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/api/materials", tags=["materials"])

AdminOrTeacher = require_roles(UserRole.admin, UserRole.teacher)


# ── Modullar ──

@router.get("/modules", response_model=List[ModuleOut])
def list_modules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Module)
        .filter(Module.is_active == True)
        .order_by(Module.order, Module.id)
        .all()
    )


@router.post("/modules", response_model=ModuleOut, status_code=status.HTTP_201_CREATED)
def create_module(
    body: ModuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    m = Module(**body.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@router.put("/modules/{mid}", response_model=ModuleOut)
def update_module(
    mid: int,
    body: ModuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    m = db.query(Module).filter(Module.id == mid, Module.is_active == True).first()
    if not m:
        raise HTTPException(status_code=404, detail="Modul topilmadi")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(m, k, v)
    db.commit()
    db.refresh(m)
    return m


@router.delete("/modules/{mid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_module(
    mid: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    m = db.query(Module).filter(Module.id == mid).first()
    if not m:
        raise HTTPException(status_code=404, detail="Modul topilmadi")
    m.is_active = False
    db.commit()


# ── Mavzular ──

@router.get("/modules/{mid}/topics", response_model=List[TopicOut])
def list_topics(
    mid: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Topic)
        .filter(Topic.module_id == mid, Topic.is_active == True)
        .order_by(Topic.order, Topic.id)
        .all()
    )


@router.post("/modules/{mid}/topics", response_model=TopicOut, status_code=status.HTTP_201_CREATED)
def create_topic(
    mid: int,
    body: TopicCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    m = db.query(Module).filter(Module.id == mid, Module.is_active == True).first()
    if not m:
        raise HTTPException(status_code=404, detail="Modul topilmadi")
    t = Topic(module_id=mid, **body.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.put("/topics/{tid}", response_model=TopicOut)
def update_topic(
    tid: int,
    body: TopicUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    t = db.query(Topic).filter(Topic.id == tid, Topic.is_active == True).first()
    if not t:
        raise HTTPException(status_code=404, detail="Mavzu topilmadi")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(t, k, v)
    db.commit()
    db.refresh(t)
    return t


@router.delete("/topics/{tid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_topic(
    tid: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    t = db.query(Topic).filter(Topic.id == tid).first()
    if not t:
        raise HTTPException(status_code=404, detail="Mavzu topilmadi")
    t.is_active = False
    db.commit()
