from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ACCESS_COOKIE_NAME = "access_token"
REFRESH_COOKIE_NAME = "refresh_token"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode["exp"] = expire
    to_encode["type"] = "refresh"
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token yaroqsiz")


def create_2fa_pending_token(user_id: int) -> str:
    """Parol to'g'ri, lekin 2FA kodi hali tasdiqlanmagan holat uchun — API'ga kirish huquqi bermaydi."""
    return jwt.encode(
        {"sub": str(user_id), "type": "2fa_pending", "exp": datetime.utcnow() + timedelta(minutes=5)},
        settings.SECRET_KEY, algorithm=settings.ALGORITHM,
    )


def decode_2fa_pending_token(token: str) -> int:
    payload = decode_token(token)
    if payload.get("type") != "2fa_pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token yaroqsiz")
    return int(payload["sub"])


def set_auth_cookies(response, access_token: str, refresh_token: str):
    response.set_cookie(
        key=ACCESS_COOKIE_NAME, value=access_token,
        httponly=True, secure=settings.COOKIE_SECURE, samesite="lax", path="/",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key=REFRESH_COOKIE_NAME, value=refresh_token,
        httponly=True, secure=settings.COOKIE_SECURE, samesite="lax", path="/",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )


def clear_auth_cookies(response):
    response.delete_cookie(ACCESS_COOKIE_NAME, path="/")
    response.delete_cookie(REFRESH_COOKIE_NAME, path="/")


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
):
    from app.models.user import User
    token = request.cookies.get(ACCESS_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Tizimga kirilmagan")
    payload = decode_token(token)
    if payload.get("type") == "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token ishlatib bo'lmaydi")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token yaroqsiz")
    user = db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Foydalanuvchi topilmadi")
    return user


def require_roles(*roles, module: Optional[str] = None):
    def checker(current_user=Depends(get_current_user)):
        role_value = getattr(current_user.role, 'value', current_user.role)
        if role_value == "super_admin":
            return current_user  # super_admin barcha rollardan o'tadi
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ruxsat yo'q")
        if module and role_value == "admin":
            perms = current_user.permissions
            if perms and module not in perms:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu modulga ruxsat yo'q")
        return current_user
    return checker
