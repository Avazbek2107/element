from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.database import get_db
from app.models.user import User, UserRole
from app.models.group import Group
from app.models.room import Room
from app.models.student import StudentProfile
from app.schemas.group import GroupCreate, GroupUpdate, GroupOut
from app.utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/api/groups", tags=["groups"])

AdminOrTeacher = require_roles(UserRole.admin, UserRole.teacher)

DAY_UZ = {
    "monday": "Dushanba", "tuesday": "Seshanba", "wednesday": "Chorshanba",
    "thursday": "Payshanba", "friday": "Juma", "saturday": "Shanba", "sunday": "Yakshanba",
}

def _time_str(entry) -> str:
    """Schedule entry → vaqt qatori. 'HH:MM-HH:MM' yoki {'time':..., 'room_id':...}"""
    if isinstance(entry, str):
        return entry
    if isinstance(entry, dict):
        return entry.get("time", "")
    return ""

def _room_id(entry) -> Optional[int]:
    if isinstance(entry, dict):
        return entry.get("room_id")
    return None

def _parse_range(s: str):
    """'09:00-11:00' → (9.0, 11.0)"""
    try:
        start, end = s.split("-")
        def f(t):
            h, m = t.strip().split(":")
            return int(h) + int(m) / 60
        return f(start), f(end)
    except Exception:
        return None, None

def _overlaps(ns, ne, os_, oe) -> bool:
    return ns < oe and os_ < ne

def _check_teacher_conflict(
    db: Session,
    teacher_id: int,
    schedule: dict,
    exclude_group_id: Optional[int] = None,
):
    if not teacher_id or not schedule:
        return
    query = db.query(Group).filter(Group.teacher_id == teacher_id, Group.is_active == True)
    if exclude_group_id:
        query = query.filter(Group.id != exclude_group_id)
    for other in query.all():
        if not other.schedule:
            continue
        for day, entry in schedule.items():
            if day not in other.schedule:
                continue
            ns, ne = _parse_range(_time_str(entry))
            os_, oe = _parse_range(_time_str(other.schedule[day]))
            if None in (ns, ne, os_, oe):
                continue
            if _overlaps(ns, ne, os_, oe):
                day_name = DAY_UZ.get(day, day)
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"O'qituvchi {day_name} kuni {_time_str(other.schedule[day])} vaqtida "
                        f"«{other.name}» guruhida dars beradi. "
                        f"Bir vaqtda bir nechta guruhga dars berib bo'lmaydi."
                    ),
                )

def _check_room_conflict(
    db: Session,
    schedule: dict,
    exclude_group_id: Optional[int] = None,
):
    if not schedule:
        return
    for day, entry in schedule.items():
        rid = _room_id(entry)
        if not rid:
            continue
        ns, ne = _parse_range(_time_str(entry))
        if None in (ns, ne):
            continue
        query = db.query(Group).filter(Group.is_active == True)
        if exclude_group_id:
            query = query.filter(Group.id != exclude_group_id)
        for other in query.all():
            if not other.schedule or day not in other.schedule:
                continue
            if _room_id(other.schedule[day]) != rid:
                continue
            os_, oe = _parse_range(_time_str(other.schedule[day]))
            if None in (os_, oe):
                continue
            if _overlaps(ns, ne, os_, oe):
                day_name = DAY_UZ.get(day, day)
                room = db.query(Room).filter(Room.id == rid).first()
                room_name = room.name if room else f"#{rid}"
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"{day_name} kuni {_time_str(other.schedule[day])} vaqtida "
                        f"«{room_name}» xonasida «{other.name}» guruhining darsi bor. "
                        f"Bir vaqtda bitta xonaga ikki dars belgilanmaydi."
                    ),
                )


def _build_group_out(group: Group, student_count: int = 0) -> GroupOut:
    teacher_name = None
    if group.teacher:
        teacher_name = f"{group.teacher.first_name} {group.teacher.last_name}"
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
    counts = dict(
        db.query(StudentProfile.group_id, func.count(StudentProfile.id))
        .filter(StudentProfile.group_id.isnot(None))
        .group_by(StudentProfile.group_id)
        .all()
    )
    return [_build_group_out(g, counts.get(g.id, 0)) for g in groups]


@router.post("", response_model=GroupOut, status_code=status.HTTP_201_CREATED)
def create_group(
    body: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    _check_teacher_conflict(db, body.teacher_id, body.schedule)
    _check_room_conflict(db, body.schedule)
    group = Group(**body.model_dump())
    db.add(group)
    db.commit()
    db.refresh(group)
    return _build_group_out(group, 0)


@router.get("/{group_id}", response_model=GroupOut)
def get_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Guruh topilmadi")
    count = db.query(func.count(StudentProfile.id)).filter(StudentProfile.group_id == group_id).scalar() or 0
    return _build_group_out(group, count)


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

    # Yangilanayotgan teacher_id va schedule ni aniqlash
    effective_teacher  = body.teacher_id  if body.teacher_id  is not None else group.teacher_id
    effective_schedule = body.schedule    if body.schedule    is not None else group.schedule
    _check_teacher_conflict(db, effective_teacher, effective_schedule, exclude_group_id=group_id)
    _check_room_conflict(db, effective_schedule, exclude_group_id=group_id)

    for key, value in body.model_dump(exclude_none=True).items():
        setattr(group, key, value)
    db.commit()
    db.refresh(group)
    count = db.query(func.count(StudentProfile.id)).filter(StudentProfile.group_id == group_id).scalar() or 0
    return _build_group_out(group, count)


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
