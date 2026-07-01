from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import csv, io
from app.database import get_db
from app.models.user import User, UserRole
from app.models.student import StudentProfile
from app.models.group import Group
from app.schemas.student import StudentCreate, StudentUpdate, StudentOut, StudentListOut
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
        middle_name=profile.middle_name,
        gender=profile.gender,
        email=user.email,
        phone=user.phone,
        group_id=profile.group_id,
        group_name=profile.group.name if profile.group else None,
        birth_date=profile.birth_date,
        parent_phone=profile.parent_phone,
        address=profile.address,
        avatar_url=profile.avatar_url,
        doc_type=profile.doc_type,
        doc_series=profile.doc_series,
        link_code=profile.link_code,
        student_link_code=profile.student_link_code,
        parent_telegram_id=profile.parent_telegram_id,
        student_telegram_id=profile.student_telegram_id,
        enrolled_date=profile.enrolled_date,
        course_start_date=profile.course_start_date,
        course_end_date=profile.course_end_date,
        is_active=user.is_active,
    )


@router.get("", response_model=StudentListOut)
def list_students(
    search: Optional[str] = Query(None),
    group_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=500),
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

    total = query.count()
    profiles = query.offset(skip).limit(limit).all()
    return {"items": [_build_student_out(p) for p in profiles], "total": total}


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
    USER_FIELDS = {"first_name", "last_name", "phone"}
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in USER_FIELDS:
            setattr(user, field, value)
        else:
            setattr(profile, field, value)

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


@router.post("/import", status_code=200)
async def import_students(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOrTeacher),
):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ("csv", "xlsx"):
        raise HTTPException(status_code=400, detail="Faqat .csv yoki .xlsx fayl yuklang")

    content = await file.read()

    if ext == "csv":
        text = content.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))
        rows = [{k.strip(): (v.strip() if v else "") for k, v in r.items()} for r in reader]
    else:
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(content))
        ws = wb.active
        label_map = {
            "Ism": "first_name", "Familiya": "last_name", "Sharif": "middle_name",
            "Jinsi": "gender", "Email": "email", "Telefon": "phone",
            "Login": "username", "Parol": "password",
            "Tug'ilgan sana": "birth_date", "Ota-ona tel": "parent_phone", "Manzil": "address",
        }
        headers = [str(c.value).strip() if c.value else "" for c in ws[1]]
        keys = [label_map.get(h, h.lower()) for h in headers]
        rows = []
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not any(row):
                continue
            rows.append({keys[i]: (str(v).strip() if v is not None else "") for i, v in enumerate(row)})

    created, skipped, errors = [], [], []

    for i, row in enumerate(rows, start=1):
        fn    = row.get("first_name", "").strip()
        ln    = row.get("last_name", "").strip()
        mn    = row.get("middle_name", "").strip() or None
        _g    = row.get("gender", "").strip().lower()
        GENDER_MAP = {"male": "male", "female": "female", "o'g'il": "male", "qiz": "female", "erkak": "male", "ayol": "female"}
        gender = GENDER_MAP.get(_g) or None
        email = row.get("email", "").strip()
        uname = row.get("username", "").strip()
        pwd   = row.get("password", "").strip() or "Student@1234"
        phone = row.get("phone", "").strip() or None
        parent_phone = row.get("parent_phone", "").strip() or None
        address = row.get("address", "").strip() or None

        from datetime import date as dt_date
        birth_date = None
        bd_str = row.get("birth_date", "").strip()
        if bd_str:
            for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y"):
                try:
                    from datetime import datetime
                    birth_date = datetime.strptime(bd_str, fmt).date()
                    break
                except Exception:
                    pass

        if not fn or not ln or not email or not uname:
            errors.append({"row": i, "reason": "Majburiy maydonlar bo'sh"})
            continue
        if db.query(User).filter(User.email == email).first():
            skipped.append({"row": i, "email": email, "reason": "Email allaqachon mavjud"})
            continue
        if db.query(User).filter(User.username == uname).first():
            skipped.append({"row": i, "email": email, "reason": "Username band"})
            continue

        user = User(
            first_name=fn, last_name=ln, email=email, username=uname,
            phone=phone, password_hash=hash_password(pwd), role=UserRole.student,
        )
        db.add(user)
        db.flush()

        profile = StudentProfile(
            user_id=user.id, middle_name=mn, gender=gender,
            birth_date=birth_date, parent_phone=parent_phone, address=address,
        )
        db.add(profile)
        created.append({"email": email, "username": uname})

    db.commit()
    return {"created": len(created), "skipped": len(skipped), "errors": len(errors),
            "details": {"skipped": skipped, "errors": errors}}
