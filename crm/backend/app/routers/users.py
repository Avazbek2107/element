from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import csv, io
from pathlib import Path
from app.database import get_db
from app.models.user import User, UserRole
from app.utils.auth import require_roles, hash_password

router = APIRouter(prefix="/api/users", tags=["users"])

AdminOnly = require_roles(UserRole.admin)


def _parse_csv(content: bytes) -> list[dict]:
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    rows = []
    for row in reader:
        rows.append({k.strip(): v.strip() for k, v in row.items()})
    return rows


def _parse_xlsx(content: bytes) -> list[dict]:
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(content))
    ws = wb.active
    headers = [str(cell.value).strip() for cell in ws[1]]
    # Excel'dagi uzbek sarlavhalarni ingliz kalitlarga map qilamiz
    label_map = {
        "Ism": "first_name", "Familiya": "last_name", "Email": "email",
        "Telefon": "phone", "Login": "username", "Parol": "password",
        "Fan": "subject",
    }
    keys = [label_map.get(h, h.lower()) for h in headers]
    rows = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not any(row):
            continue
        rows.append({keys[i]: (str(v).strip() if v is not None else "") for i, v in enumerate(row)})
    return rows


@router.post("/import-teachers")
async def import_teachers(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(AdminOnly),
):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ("csv", "xlsx"):
        raise HTTPException(status_code=400, detail="Faqat .csv yoki .xlsx fayl yuklang")

    content = await file.read()
    try:
        rows = _parse_csv(content) if ext == "csv" else _parse_xlsx(content)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Faylni o'qishda xato: {e}")

    if not rows:
        raise HTTPException(status_code=422, detail="Fayl bo'sh yoki format noto'g'ri")

    created, skipped, errors = [], [], []

    for i, row in enumerate(rows, start=1):
        fn   = row.get("first_name", "").strip()
        ln   = row.get("last_name", "").strip()
        email= row.get("email", "").strip()
        uname= row.get("username", "").strip()
        pwd  = row.get("password", "Teacher@1234")
        phone= row.get("phone", "").strip() or None

        if not fn or not ln or not email or not uname:
            errors.append({"row": i, "reason": "Majburiy maydonlar bo'sh (ism, familiya, email, username)"})
            continue

        if db.query(User).filter(User.email == email).first():
            skipped.append({"row": i, "email": email, "reason": "Email allaqachon mavjud"})
            continue
        if db.query(User).filter(User.username == uname).first():
            skipped.append({"row": i, "email": email, "reason": "Username band"})
            continue

        user = User(
            first_name=fn,
            last_name=ln,
            email=email,
            username=uname,
            phone=phone,
            password_hash=hash_password(pwd),
            role=UserRole.teacher,
        )
        db.add(user)
        created.append({"email": email, "username": uname})

    db.commit()

    return {
        "created": len(created),
        "skipped": len(skipped),
        "errors": len(errors),
        "details": {"created": created, "skipped": skipped, "errors": errors},
    }


@router.get("/teachers", response_model=List[dict])
def list_teachers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.teacher)),
):
    teachers = db.query(User).filter(
        User.role == UserRole.teacher,
        User.is_active == True,
    ).order_by(User.last_name).all()
    return [
        {"id": t.id, "first_name": t.first_name, "last_name": t.last_name,
         "email": t.email, "phone": t.phone, "username": t.username}
        for t in teachers
    ]
