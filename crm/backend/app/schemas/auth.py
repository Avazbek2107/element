from pydantic import BaseModel, EmailStr
from app.models.user import UserRole


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: str | None = None


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    phone: str | None = None
    first_name: str
    last_name: str
    role: UserRole
    is_active: bool
    permissions: list[str] | None = None

    class Config:
        from_attributes = True
