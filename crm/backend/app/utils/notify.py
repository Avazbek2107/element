import os
import httpx


def send_telegram_message(chat_id: str, text: str, parse_mode: str = "HTML") -> bool:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    if not token or not chat_id:
        return False
    try:
        httpx.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat_id, "text": text, "parse_mode": parse_mode},
            timeout=5,
        )
        return True
    except Exception:
        return False


def send_test_notification(chat_id: str, test_id: int, test_title: str, group_name: str, question_count: int) -> bool:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    if not token or not chat_id:
        return False
    text = (
        f"📝 <b>Yangi test qo'shildi!</b>\n\n"
        f"📋 <b>{test_title}</b>\n"
        f"👥 Guruh: {group_name}\n"
        f"❓ Savollar: {question_count} ta\n\n"
        f"Test javoblarini topshirish uchun quyidagi tugmani bosing 👇"
    )
    keyboard = {
        "inline_keyboard": [[{
            "text": "📝 Javob yuborish",
            "callback_data": f"sub_{test_id}"
        }]]
    }
    try:
        httpx.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat_id, "text": text, "parse_mode": "HTML", "reply_markup": keyboard},
            timeout=5,
        )
        return True
    except Exception:
        return False


def _progress_bar(pct: float, length: int = 16) -> str:
    filled = round(pct / 100 * length)
    return "▓" * filled + "░" * (length - filled)


def _grade_emoji(pct: float) -> str:
    if pct >= 90: return "🏆"
    if pct >= 75: return "🥇"
    if pct >= 50: return "🥈"
    return "🥉"


def _grade_label(pct: float) -> str:
    if pct >= 90: return "A'lo"
    if pct >= 75: return "Yaxshi"
    if pct >= 50: return "O'rtacha"
    return "Yomon"


def build_test_report(
    student_name: str,
    test_title: str,
    correct: int,
    total: int,
    percentage: float,
    attended: int = None,
    total_lessons: int = None,
) -> str:
    pct = round(percentage)
    bar = _progress_bar(pct)

    lines = [
        "📊 <b>Test natijasi</b>",
        "",
        f"👤 <b>{student_name}</b>",
        f"📋 {test_title}",
        "━━━━━━━━━━━━━━━━━━",
        "",
        f"✏️ <b>Savol-javob:</b>  {correct}/{total}",
        f"<code>{bar}</code>  <b>{pct}%</b>",
        "",
    ]

    if attended is not None and total_lessons and total_lessons > 0:
        att_pct = round(attended / total_lessons * 100)
        att_bar = _progress_bar(att_pct)
        lines += [
            f"📅 <b>Faollik (bu oy):</b>  {attended}/{total_lessons}",
            f"<code>{att_bar}</code>  <b>{att_pct}%</b>",
            "",
        ]

    lines += [
        "━━━━━━━━━━━━━━━━━━",
        f"{_grade_emoji(pct)} <b>Baho:</b> {_grade_label(pct)}",
    ]

    return "\n".join(lines)
