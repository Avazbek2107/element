"""TOTP (Google Authenticator uslubidagi) ikki bosqichli autentifikatsiya yordamchilari."""
import base64
import io
import secrets
import pyotp
import qrcode
from app.utils.auth import pwd_context

ISSUER_NAME = "Element CRM"


def generate_secret() -> str:
    return pyotp.random_base32()


def provisioning_uri(secret: str, email: str) -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name=ISSUER_NAME)


def qr_code_data_uri(uri: str) -> str:
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    encoded = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/png;base64,{encoded}"


def verify_totp_code(secret: str, code: str) -> bool:
    if not secret or not code:
        return False
    return pyotp.TOTP(secret).verify(code.strip(), valid_window=1)


def generate_backup_codes(count: int = 8) -> list[str]:
    return [secrets.token_hex(4) for _ in range(count)]  # masalan "a1b2c3d4"


def hash_backup_codes(codes: list[str]) -> list[str]:
    return [pwd_context.hash(c) for c in codes]


def consume_backup_code(hashed_codes: list[str], code: str) -> list[str] | None:
    """Kod to'g'ri bo'lsa, uni ro'yxatdan olib tashlab yangi ro'yxatni qaytaradi. Noto'g'ri bo'lsa None."""
    code = code.strip()
    for h in hashed_codes or []:
        if pwd_context.verify(code, h):
            return [x for x in hashed_codes if x != h]
    return None
