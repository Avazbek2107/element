"""Eskiz.uz orqali SMS yuborish. Telegram bog'lanmagan ota-onalar uchun zaxira kanal."""
import time
import httpx
from app.config import settings

_token_cache = {"token": None, "expires_at": 0}


def _get_token() -> str | None:
    if not settings.ESKIZ_EMAIL or not settings.ESKIZ_PASSWORD:
        return None

    if _token_cache["token"] and _token_cache["expires_at"] > time.time():
        return _token_cache["token"]

    try:
        resp = httpx.post(
            "https://notify.eskiz.uz/api/auth/login",
            data={"email": settings.ESKIZ_EMAIL, "password": settings.ESKIZ_PASSWORD},
            timeout=10,
        )
        resp.raise_for_status()
        token = resp.json()["data"]["token"]
        _token_cache["token"] = token
        _token_cache["expires_at"] = time.time() + 25 * 24 * 3600  # ~25 kun
        return token
    except Exception:
        return None


def send_sms(phone: str, text: str) -> bool:
    if not phone:
        return False
    token = _get_token()
    if not token:
        return False

    normalized = "".join(c for c in phone if c.isdigit())
    if normalized.startswith("998") and len(normalized) == 12:
        pass
    elif len(normalized) == 9:
        normalized = "998" + normalized
    else:
        return False

    try:
        resp = httpx.post(
            "https://notify.eskiz.uz/api/message/sms/send",
            headers={"Authorization": f"Bearer {token}"},
            data={"mobile_phone": normalized, "message": text, "from": "4546"},
            timeout=10,
        )
        return resp.status_code == 200
    except Exception:
        return False
