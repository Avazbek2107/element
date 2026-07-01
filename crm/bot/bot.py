import asyncio
import logging
import os
import re
from pathlib import Path

import httpx
from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart, Command
from aiogram.types import (
    Message, CallbackQuery,
    InlineKeyboardMarkup, InlineKeyboardButton,
)

# .env fayldan yuklash
_env_file = Path(__file__).parent.parent / "backend" / ".env"
if _env_file.exists():
    for _line in _env_file.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000").strip()

CODE_RE = re.compile(r"^[A-Z0-9]{8}$")

bot = Bot(token=TOKEN)
dp  = Dispatcher()
HEADERS = {"X-Bot-Secret": TOKEN}

# chat_id → "student" | "parent"  (vaqtinchalik xotira)
pending_role: dict[int, str] = {}

ROLE_KEYBOARD = InlineKeyboardMarkup(inline_keyboard=[[
    InlineKeyboardButton(text="👨‍🎓  O'quvchi",  callback_data="role_student"),
    InlineKeyboardButton(text="👪  Ota-ona",    callback_data="role_parent"),
]])

WELCOME_TEXT = (
    "Salom! Bu <b>Element o'quv markazi</b> boti.\n\n"
    "Siz kim sifatida platformaga birikmoqchisiz?"
)


# ── Rol tanlash ──────────────────────────────────────────────────────────────

async def _show_role_selection(target):
    """Message yoki CallbackQuery uchun rol tanlash xabarini yuboradi."""
    if isinstance(target, Message):
        await target.answer(WELCOME_TEXT, reply_markup=ROLE_KEYBOARD, parse_mode="HTML")
    else:
        await target.message.edit_text(
            WELCOME_TEXT, reply_markup=ROLE_KEYBOARD, parse_mode="HTML"
        )


@dp.message(CommandStart(deep_link=True))
async def start_with_code(message: Message, command):
    code = (command.args or "").strip()
    if code:
        await _try_link(message, code)
    else:
        await _show_role_selection(message)


@dp.message(CommandStart())
async def start_plain(message: Message):
    await _show_role_selection(message)


@dp.callback_query(F.data == "role_student")
async def on_role_student(callback: CallbackQuery):
    pending_role[callback.message.chat.id] = "student"
    await callback.message.edit_text(
        "👨‍🎓 <b>O'quvchi</b> sifatida birikmoqdasiz.\n\n"
        "Administrator bergan <b>8 belgili o'quvchi kodingizni</b> yuboring:",
        parse_mode="HTML",
    )
    await callback.answer()


@dp.callback_query(F.data == "role_parent")
async def on_role_parent(callback: CallbackQuery):
    pending_role[callback.message.chat.id] = "parent"
    await callback.message.edit_text(
        "👪 <b>Ota-ona</b> sifatida birikmoqdasiz.\n\n"
        "Administrator bergan <b>8 belgili ota-ona kodingizni</b> yuboring:",
        parse_mode="HTML",
    )
    await callback.answer()


# ── Bog'lash logikasi ────────────────────────────────────────────────────────

async def _try_link(message: Message, code: str, role: str | None = None):
    code = code.strip().upper()
    if not CODE_RE.match(code):
        await message.answer(
            "❌ Kod noto'g'ri formatda.\n"
            "Kod 8 ta harf yoki raqamdan iborat bo'lishi kerak."
        )
        return

    payload = {"code": code, "chat_id": str(message.chat.id)}
    if role:
        payload["role"] = role

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{BACKEND_URL}/api/telegram/link-by-code",
                json=payload,
                headers=HEADERS,
            )

        if resp.status_code == 200:
            data = resp.json()
            name = data.get("student_name", "")
            pending_role.pop(message.chat.id, None)

            if data.get("type") == "parent":
                await message.answer(
                    f"✅ <b>Muvaffaqiyatli birikdingiz!</b> (Ota-ona)\n\n"
                    f"O'quvchi: <b>{name}</b>\n\n"
                    f"Endi farzandingizning darsga kelishi va test natijalari "
                    f"haqida shu yerga xabar olib turasiz.",
                    parse_mode="HTML",
                )
            else:
                await message.answer(
                    f"✅ <b>Muvaffaqiyatli birikdingiz!</b> (O'quvchi)\n\n"
                    f"Ism: <b>{name}</b>\n\n"
                    f"Test qo'shilganda sizga xabar keladi va "
                    f"javoblarni topshirishingiz mumkin bo'ladi.\n\n"
                    f"Qo'lda topshirish uchun:\n"
                    f"/javob [test_id] [javoblar]",
                    parse_mode="HTML",
                )

        elif resp.status_code == 400:
            detail = resp.json().get("detail", "Xatolik")
            await message.answer(f"❌ {detail}")

        elif resp.status_code == 404:
            await message.answer(
                "❌ Bunday kod topilmadi.\n"
                "Kodni administratordan qaytadan so'rang."
            )
        else:
            await message.answer("Xatolik yuz berdi. Birozdan so'ng qayta urinib ko'ring.")

    except Exception:
        await message.answer("Serverga ulanib bo'lmadi. Birozdan so'ng qayta urinib ko'ring.")


# ── Test javobini topshirish ─────────────────────────────────────────────────

@dp.callback_query(F.data.startswith("sub_"))
async def on_submit_button(callback: CallbackQuery):
    test_id = callback.data.split("_")[1]
    await callback.message.answer(
        f"📝 <b>Test #{test_id}</b> uchun javoblaringizni yuboring:\n\n"
        f"Format: <code>/javob {test_id} JAVOBLAR</code>\n\n"
        f"Masalan: <code>/javob {test_id} ABDCA</code>\n\n"
        f"⚠️ Faqat A, B, C, D harflarini kiriting. "
        f"Faqat <b>bir marta</b> topshirish mumkin!",
        parse_mode="HTML",
    )
    await callback.answer()


@dp.message(Command("javob"))
async def submit_test(message: Message, command):
    args = (command.args or "").strip().split()
    if len(args) < 2:
        await message.answer(
            "❌ Format: /javob [test_id] [javoblar]\n"
            "Masalan: /javob 5 ABDCA"
        )
        return

    test_id_str, answers = args[0], args[1]
    if not test_id_str.isdigit():
        await message.answer("❌ Test raqami noto'g'ri. Masalan: /javob 5 ABDCA")
        return
    if not re.match(r"^[A-Da-d]+$", answers):
        await message.answer(
            "❌ Javoblar faqat A, B, C, D harflaridan iborat bo'lishi kerak.\n"
            "Masalan: /javob 5 ABDCA"
        )
        return

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{BACKEND_URL}/api/telegram/submit-test",
                json={
                    "chat_id": str(message.chat.id),
                    "test_id": int(test_id_str),
                    "answers": answers.upper(),
                },
                headers=HEADERS,
            )

        if resp.status_code == 200:
            d = resp.json()
            pct  = round(float(d["percentage"]))
            bars = "▓" * round(pct / 100 * 16) + "░" * (16 - round(pct / 100 * 16))
            grade_emoji = (
                "🏆" if pct >= 90 else
                "🥇" if pct >= 75 else
                "🥈" if pct >= 50 else "🥉"
            )
            await message.answer(
                f"✅ <b>Test qabul qilindi!</b>\n\n"
                f"📋 {d['test_title']}\n"
                f"━━━━━━━━━━━━━━━━━━\n\n"
                f"✏️ <b>Natija:</b>  {d['correct']}/{d['total']}\n"
                f"<code>{bars}</code>  <b>{pct}%</b>\n\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"{grade_emoji} <b>Baho:</b> {d['grade']}",
                parse_mode="HTML",
            )
        elif resp.status_code == 403:
            await message.answer(
                "❌ Telegram hisobingiz hali bog'lanmagan.\n"
                "Avval /start buyrug'ini bosing va o'quvchi kodingizni kiriting."
            )
        elif resp.status_code in (404, 400):
            detail = resp.json().get("detail", "")
            await message.answer(f"❌ {detail}")
        else:
            await message.answer("Xatolik yuz berdi. Birozdan so'ng qayta urinib ko'ring.")

    except Exception:
        await message.answer("Serverga ulanib bo'lmadi. Birozdan so'ng qayta urinib ko'ring.")


# ── Matn xabari — kod yoki yo'riqnoma ────────────────────────────────────────

@dp.message(F.text)
async def maybe_code(message: Message):
    text = (message.text or "").strip().upper()
    if CODE_RE.match(text):
        role = pending_role.get(message.chat.id)
        await _try_link(message, text, role=role)
    else:
        # Rol tanlanmagan bo'lsa qayta selection ko'rsat
        if message.chat.id not in pending_role:
            await _show_role_selection(message)
        else:
            role_label = "o'quvchi" if pending_role[message.chat.id] == "student" else "ota-ona"
            await message.answer(
                f"Iltimos, administrator bergan 8 belgili {role_label} kodingizni yuboring.\n\n"
                f"Qayta boshlash uchun /start bosing."
            )


# ── Main ─────────────────────────────────────────────────────────────────────

async def main():
    logging.basicConfig(level=logging.INFO)
    if not TOKEN:
        logging.error("TELEGRAM_BOT_TOKEN o'rnatilmagan, bot ishga tushmaydi.")
        return
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
