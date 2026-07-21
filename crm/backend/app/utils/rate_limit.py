"""Xotirada ishlaydigan sodda rate-limiter — bitta backend nusxasi uchun yetarli.
Ko'p nusxali (masshtablangan) joylashtirishda buni Redis asosidagi yechimga almashtirish kerak bo'ladi.
"""
import time
import threading
from collections import defaultdict
from fastapi import HTTPException, status

_lock = threading.Lock()
_attempts: dict[str, list[float]] = defaultdict(list)


def check_rate_limit(key: str, max_attempts: int, window_seconds: int):
    now = time.time()
    with _lock:
        recent = [t for t in _attempts[key] if now - t < window_seconds]
        if len(recent) >= max_attempts:
            retry_after = int(window_seconds - (now - recent[0]))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Juda ko'p urinish. {max(retry_after, 1)} soniyadan so'ng qayta urinib ko'ring.",
            )
        recent.append(now)
        _attempts[key] = recent


def reset():
    """Faqat testlar uchun — holatni tozalaydi."""
    with _lock:
        _attempts.clear()
