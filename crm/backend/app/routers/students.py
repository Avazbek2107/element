from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.user import User, UserRole
from app.models.student import StudentProfile
from app.models.group import Group
from app.schemas.student import StudentCreate, StudentUpdate, StudentOut
from app.utils.auth import get_current_user, require_roles
from app.utils.auth import hash_password

router = APIRouter(prefix="/api/students", tags=["students"])

AdminOrTeacher = require_roles(UserRole.admin, UserRole.teacher)


def _build_student_out(profile: StudentProfile) -> StudentOut:
    user = profile.user
    return StudentOut(
        id=profile.id,
        user_id=profile.user_id,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        phone=user.phone,
        group_id=profile.group_id,
        group_name=profile.group.name if profile.group else None,
        birth_date=profile.birth_date,
        parent_phone=profile.parent_phone,
        address=profile.address,
        enrolled_date=profile.enrolled_date,
        course_start_date=profile.course_start_date,
        course_end_date=profile.course_end_date,
        is_active=user.is_active,
    )


@router.get("", response_model=List[StudentOut])
def list_students(
    search: Optional[str] = Query(None),
    group_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    query = db.query(StudentProfile).join(User).filter(User.is_active == True)

    if group_id:
        query = query.filter(StudentProfile.group_id == group_id)

    if search:
        query = query.filter(
            (User.first_name.ilike(f"%{search}%"))
            | (User.last_name.ilike(f"%{search}%"))
            | (User.phone.ilike(f"%{search}%"))
        )

    profiles = query.all()
    return [_build_student_out(p) for p in profiles]


@router.post("", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
def create_student(
    body: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Bu email allaqachon mavjud")
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Bu username band")

    user = User(
        username=body.username,
        email=body.email,
        password_hash=hash_password(body.password),
        first_name=body.first_name,
        last_name=body.last_name,
        phone=body.phone,
        role=UserRole.student,
    )
    db.add(user)
    db.flush()

    profile = StudentProfile(
        user_id=user.id,
        group_id=body.group_id,
        birth_date=body.birth_date,
        parent_phone=body.parent_phone,
        parent_telegram_id=body.parent_telegram_id,
        address=body.address,
        course_start_date=body.course_start_date,
        course_end_date=body.course_end_date,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return _build_student_out(profile)


@router.get("/{student_id}", response_model=StudentOut)
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="O'quvchi topilmadi")
    # O'quvchi faqat o'zini ko'ra oladi
    if current_user.role == UserRole.student:
        own_profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if not own_profile or own_profile.id != student_id:
            raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    return _build_student_out(profile)


@router.put("/{student_id}", response_model=StudentOut)
def update_student(
    student_id: int,
    body: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="O'quvchi topilmadi")

    user = profile.user
    if body.first_name is not None:
        user.first_name = body.first_name
    if body.last_name is not None:
        user.last_name = body.last_name
    if body.phone is not None:
        user.phone = body.phone

    update_data = body.model_dump(exclude={"first_name", "last_name", "phone"}, exclude_none=True)
    for key, value in update_data.items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return _build_student_out(profile)


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="O'quvchi topilmadi")
    profile.user.is_active = False
    db.commit()
