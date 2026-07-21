from app.utils.notify import send_telegram_message
from app.utils.sms import send_sms


def deliver_to_parent(student_profile, text: str) -> tuple[str, str]:
    """Ota-onaga xabar yetkazishga urinadi: avval Telegram, keyin SMS.
    Qaytaradi: (channel, status) — channel: telegram|sms|none, status: sent|failed|no_contact
    """
    if student_profile.parent_telegram_id:
        if send_telegram_message(student_profile.parent_telegram_id, text):
            return "telegram", "sent"
        return "telegram", "failed"

    if student_profile.parent_phone:
        if send_sms(student_profile.parent_phone, text):
            return "sms", "sent"
        return "sms", "failed"

    return "none", "no_contact"
