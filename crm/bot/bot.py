import asyncio
import logging
import os
import re
from pathlib import Path

import httpx
from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart, Command
from aiogram.types import Message, CallbackQuery

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

WELCOME_TEXT = (
    "Salom! Bu element o'quv markazi boti.\n\n"
    "📌 Ota-ona yoki o'quvchi bo'lsangiz, administrator bergan bog'lash kodini shu yerga yuboring.\n\n"
    "📝 O'quvchilar qog'oz testni ishlab bo'lgach:\n"
    "/javob [test_id] [javoblar]\n"
    "Masalan: /javob 5 ABDCA"
)

bot = Bot(token=TOKEN)
dp = Dispatcher()
HEADERS = {"X-Bot-Secret": TOKEN}


async def try_link(message: Message, code: str):
    code = code.strip().upper()
    if not CODE_RE.match(code):
        await message.answer("Kod noto'g'ri formatda. Kod 8 ta harf/raqamdan iborat bo'lishi kerak.")
        return
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{BACKEND_URL}/api/telegram/link-by-code",
                json={"code": code, "chat_id": str(message.chat.id)},
                headers=HEADERS,
            )
        if resp.status_code == 200:
            data = resp.json()
            name = data.get("student_name", "")
            if data.get("type") == "parent":
                await message.answer(
                    f"✅ Muvaffaqiyatli bog'landingiz! (Ota-ona)\n\n"
                    f"O'quvchi: {name}\n\n"
                    f"Endi farzandingizning darsga kelishi va test natijalari haqida shu yerga xabar olib turasiz."
                )
            else:
                await message.answer(
                    f"✅ Muvaffaqiyatli bog'landingiz! (O'quvchi)\n\n"
                    f"Ism: {name}\n\n"
                    f"Test qo'shilganda sizga xabar keladi va javoblarni topshirishingiz mumkin bo'ladi.\n\n"
                    f"Yoki qo'lda topshirish uchun:\n"
                    f"/javob [test_id] [javoblar]"
                )
        elif resp.status_code == 404:
            await message.answer("❌ Bunday kod topilmadi. Kodni administratordan qaytadan so'rang.")
        else:
            await message.answer("Xatolik yuz berdi. Birozdan so'ng qayta urinib ko'ring.")
    except Exception:
        await message.answer("Serverga ulanib bo'lmadi. Birozdan so'ng qayta urinib ko'ring.")


@dp.message(CommandStart(deep_link=True))
async def start_with_code(message: Message, command):
    code = (command.args or "").strip()
    if not code:
        await message.answer(WELCOME_TEXT)
        return
    await try_link(message, code)


@dp.message(CommandStart())
async def start_plain(message: Message):
    await message.answer(WELCOME_TEXT)


@dp.callback_query(F.data.startswith("sub_"))
async def on_submit_button(callback: CallbackQuery):
    test_id = callback.data.split("_")[1]
    await callback.message.answer(
        f"📝 <b>Test #{test_id}</b> uchun javoblaringizni yuboring:\n\n"
        f"Format: <code>/javob {test_id} JAVOBLAR</code>\n\n"
        f"Masalan: <code>/javob {test_id} ABDCA</code>\n\n"
        f"⚠️ Faqat A, B, C, D harflarini kiriting. Faqat <b>bir marta</b> topshirish mumkin!",
        parse_mode="HTML"
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
        await message.answer("❌ Javoblar faqat A, B, C, D harflaridan iborat bo'lishi kerak.\nMasalan: /javob 5 ABDCA")
        return

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{BACKEND_URL}/api/telegram/submit-test",
                json={"chat_id": str(message.chat.id), "test_id": int(test_id_str), "answers": answers.upper()},
                headers=HEADERS,
            )
        if resp.status_code == 200:
            d = resp.json()
            pct = round(float(d['percentage']))
            bars = "▓" * round(pct / 100 * 16) + "░" * (16 - round(pct / 100 * 16))
            grade_emoji = "🏆" if pct >= 90 else "🥇" if pct >= 75 else "🥈" if pct >= 50 else "🥉"
            await message.answer(
                f"✅ <b>Test qabul qilindi!</b>\n\n"
                f"📋 {d['test_title']}\n"
                f"━━━━━━━━━━━━━━━━━━\n\n"
                f"✏️ <b>Natija:</b>  {d['correct']}/{d['total']}\n"
                f"<code>{bars}</code>  <b>{pct}%</b>\n\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"{grade_emoji} <b>Baho:</b> {d['grade']}",
                parse_mode="HTML"
            )
        elif resp.status_code == 403:
            await message.answer(
                "❌ Telegram hisobingiz hali bog'lanmagan.\n"
                "Avval administratordan o'quvchi kodini oling va shu yerga yuboring."
            )
        elif resp.status_code in (404, 400):
            detail = resp.json().get("detail", "")
            await message.answer(f"❌ {detail}")
        else:
            await message.answer("Xatolik yuz berdi. Birozdan so'ng qayta urinib ko'ring.")
    except Exception:
        await message.answer("Serverga ulanib bo'lmadi. Birozdan so'ng qayta urinib ko'ring.")


@dp.message(F.text)
async def maybe_code(message: Message):
    text = (message.text or "").strip().upper()
    if CODE_RE.match(text):
        await try_link(message, text)
    else:
        await message.answer(
            "Bog'lash kodini yuboring (administratordan olasiz),\n"
            "yoki test topshirish uchun:\n/javob [test_id] [javoblar]"
        )


async def main():
    logging.basicConfig(level=logging.INFO)
    if not TOKEN:
        logging.error("TELEGRAM_BOT_TOKEN o'rnatilmagan, bot ishga tushmaydi.")
        return
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
