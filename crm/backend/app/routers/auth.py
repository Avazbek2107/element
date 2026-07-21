from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, RegisterRequest, UserOut
from app.utils.auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    create_2fa_pending_token, decode_2fa_pending_token,
    decode_token, get_current_user,
    set_auth_cookies, clear_auth_cookies,
    REFRESH_COOKIE_NAME,
)
from app.utils.rate_limit import check_rate_limit
from app.utils.totp import verify_totp_code, consume_backup_code

router = APIRouter(prefix="/api/auth", tags=["auth"])


class TwoFaRequired(BaseModel):
    requires_2fa: bool = True
    temp_token: str


class TwoFaVerifyRequest(BaseModel):
    temp_token: str
    code: str


def _issue_session(response: Response, user: User):
    token_data = {"sub": str(user.id), "role": user.role}
    set_auth_cookies(response, create_access_token(token_data), create_refresh_token(token_data))


@router.post("/login")
def login(body: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    check_rate_limit(f"login:{request.client.host}", max_attempts=10, window_seconds=300)
    user = db.query(User).filter(
        (User.username == body.username) | (User.email == body.username),
        User.is_active == True,
    ).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Login yoki parol noto'g'ri")

    if user.totp_enabled:
        return TwoFaRequired(temp_token=create_2fa_pending_token(user.id))

    _issue_session(response, user)
    return UserOut.model_validate(user)


@router.post("/login/2fa-verify", response_model=UserOut)
def login_2fa_verify(body: TwoFaVerifyRequest, response: Response, db: Session = Depends(get_db)):
    user_id = decode_2fa_pending_token(body.temp_token)
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user or not user.totp_enabled:
        raise HTTPException(status_code=401, detail="Sessiya yaroqsiz, qaytadan kiring")

    if verify_totp_code(user.totp_secret, body.code):
        _issue_session(response, user)
        return user

    remaining = consume_backup_code(user.totp_backup_codes, body.code)
    if remaining is not None:
        user.totp_backup_codes = remaining
        db.commit()
        _issue_session(response, user)
        return user

    raise HTTPException(status_code=401, detail="Kod noto'g'ri")


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    check_rate_limit(f"register:{request.client.host}", max_attempts=5, window_seconds=3600)
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Bu email allaqachon ro'yxatdan o'tgan")
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Bu username band")

    user = User(
        username=body.username,
        email=body.email,
        password_hash=hash_password(body.password),
        first_name=body.first_name,
        last_name=body.last_name,
        role=UserRole.student,
        phone=body.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/refresh-token", response_model=UserOut)
def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token topilmadi")

    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=400, detail="Refresh token emas")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token yaroqsiz")
    user = db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="Foydalanuvchi faol emas yoki topilmadi")

    _issue_session(response, user)
    return user


@router.post("/logout")
def logout(response: Response):
    clear_auth_cookies(response)
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
