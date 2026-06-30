from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User, UserRole
from app.models.group import Group
from app.models.student import StudentProfile
from app.schemas.group import GroupCreate, GroupUpdate, GroupOut
from app.utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/api/groups", tags=["groups"])

AdminOrTeacher = require_roles(UserRole.admin, UserRole.teacher)


def _build_group_out(group: Group, db: Session) -> GroupOut:
    teacher_name = None
    if group.teacher:
        teacher_name = f"{group.teacher.first_name} {group.teacher.last_name}"
    student_count = db.query(StudentProfile).filter(
        StudentProfile.group_id == group.id
    ).count()
    return GroupOut(
        id=group.id,
        name=group.name,
        description=group.description,
        teacher_id=group.teacher_id,
        teacher_name=teacher_name,
        telegram_group_link=group.telegram_group_link,
        schedule=group.schedule,
        start_date=group.start_date,
        end_date=group.end_date,
        is_active=group.is_active,
        student_count=student_count,
    )


@router.get("", response_model=List[GroupOut])
def list_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    groups = db.query(Group).filter(Group.is_active == True).all()
    return [_build_group_out(g, db) for g in groups]


@router.post("", response_model=GroupOut, status_code=status.HTTP_201_CREATED)
def create_group(
    body: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    group = Group(**body.model_dump())
    db.add(group)
    db.commit()
    db.refresh(group)
    return _build_group_out(group, db)


@router.get("/{group_id}", response_model=GroupOut)
def get_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Guruh topilmadi")
    return _build_group_out(group, db)


@router.put("/{group_id}", response_model=GroupOut)
def update_group(
    group_id: int,
    body: GroupUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Guruh topilmadi")
    for key, value in body.model_dump(exclude_none=True).items():
        setattr(group, key, value)
    db.commit()
    db.refresh(group)
    return _build_group_out(group, db)


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Guruh topilmadi")
    group.is_active = False
    db.commit()


@router.post("/{group_id}/students/{student_id}", status_code=status.HTTP_200_OK)
def assign_student_to_group(
    group_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Guruh topilmadi")
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="O'quvchi topilmadi")
    profile.group_id = group_id
    db.commit()
    return {"message": "O'quvchi guruhga biriktirildi"}


@router.delete("/{group_id}/students/{student_id}", status_code=status.HTTP_200_OK)
def remove_student_from_group(
    group_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    profile = db.query(StudentProfile).filter(
        StudentProfile.id == student_id,
        StudentProfile.group_id == group_id,
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="O'quvchi bu guruhda emas")
    profile.group_id = None
    db.commit()
    return {"message": "O'quvchi guruhdan chiqarildi"}
