import os
import httpx


def send_telegram_message(chat_id: str, text: str) -> bool:
    """Telegram botdan to'g'ridan-to'g'ri xabar yuborish (bot servisini chaqirmasdan)."""
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    if not token or not chat_id:
        return False
    try:
        httpx.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat_id, "text": text},
            timeout=5,
        )
        return True
    except Exception:
        return False
