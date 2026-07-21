from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from app.database import get_db
from app.models.user import User, UserRole
from app.utils.auth import get_current_user, require_roles, verify_password
from app.utils.audit import log_action
from app.utils.totp import (
    generate_secret, provisioning_uri, qr_code_data_uri,
    verify_totp_code, generate_backup_codes, hash_backup_codes,
)

router = APIRouter(prefix="/api/2fa", tags=["2fa"])

StaffOnly = require_roles(UserRole.super_admin, UserRole.admin)


class ConfirmRequest(BaseModel):
    code: str


class DisableRequest(BaseModel):
    code: str


class SetupOut(BaseModel):
    secret: str
    qr_code: str
    otpauth_uri: str


class ConfirmOut(BaseModel):
    backup_codes: List[str]


@router.get("/status")
def status_(current_user: User = Depends(StaffOnly)):
    return {"enabled": current_user.totp_enabled}


@router.post("/setup", response_model=SetupOut)
def setup(db: Session = Depends(get_db), current_user: User = Depends(StaffOnly)):
    if current_user.totp_enabled:
        raise HTTPException(400, "2FA allaqachon yoqilgan. Avval o'chiring.")
    secret = generate_secret()
    current_user.totp_secret = secret  # tasdiqlanmaguncha totp_enabled hali False
    db.commit()
    uri = provisioning_uri(secret, current_user.email)
    return SetupOut(secret=secret, qr_code=qr_code_data_uri(uri), otpauth_uri=uri)


@router.post("/confirm", response_model=ConfirmOut)
def confirm(body: ConfirmRequest, db: Session = Depends(get_db), current_user: User = Depends(StaffOnly)):
    if not current_user.totp_secret:
        raise HTTPException(400, "Avval /2fa/setup chaqiring")
    if not verify_totp_code(current_user.totp_secret, body.code):
        raise HTTPException(400, "Kod noto'g'ri")

    codes = generate_backup_codes()
    current_user.totp_enabled = True
    current_user.totp_backup_codes = hash_backup_codes(codes)
    log_action(db, current_user, "update", "security", "user", current_user.id,
               f"{current_user.first_name} {current_user.last_name}", details={"action": "2fa_enabled"})
    db.commit()
    return ConfirmOut(backup_codes=codes)  # faqat shu javobda ko'rinadi, qayta ko'rsatilmaydi


@router.post("/disable")
def disable(body: DisableRequest, db: Session = Depends(get_db), current_user: User = Depends(StaffOnly)):
    valid = verify_totp_code(current_user.totp_secret, body.code) or verify_password(body.code, current_user.password_hash)
    if not valid:
        raise HTTPException(400, "Kod yoki parol noto'g'ri")

    current_user.totp_enabled = False
    current_user.totp_secret = None
    current_user.totp_backup_codes = None
    log_action(db, current_user, "update", "security", "user", current_user.id,
               f"{current_user.first_name} {current_user.last_name}", details={"action": "2fa_disabled"})
    db.commit()
    return {"ok": True}


@router.post("/reset/{user_id}")
def reset_for_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.super_admin)),
):
    """Foydalanuvchi 2FA qurilmasini yo'qotgan hollarda — super_admin majburan o'chiradi."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Foydalanuvchi topilmadi")
    user.totp_enabled = False
    user.totp_secret = None
    user.totp_backup_codes = None
    log_action(db, current_user, "update", "security", "user", user.id,
               f"{user.first_name} {user.last_name}", details={"action": "2fa_reset_by_superadmin"})
    db.commit()
    return {"ok": True}
