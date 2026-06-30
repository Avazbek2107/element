import asyncio
import logging
import os
import re

import httpx
from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart, Command
from aiogram.types import Message

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:8000").strip()

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
                    f"Endi qog'oz testlarni shu bot orqali topshirishingiz mumkin:\n"
                    f"/javob [test_id] [javoblar]\n"
                    f"Masalan: /javob 5 ABDCA"
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
            await message.answer(
                f"✅ Test tekshirildi!\n\n"
                f"📋 Test: {d['test_title']}\n"
                f"✔️ To'g'ri: {d['correct']}/{d['total']}\n"
                f"📊 Ball: {d['percentage']}%\n"
                f"🏅 Baho: {d['grade']}"
            )
        elif resp.status_code == 403:
            await message.answer(
                "❌ Telegram hisobingiz hali bog'lanmagan.\n"
                "Avval administratordan o'quvchi kodini oling va shu yerga yuboring."
            )
        elif resp.status_code == 404:
            detail = resp.json().get("detail", "")
            await message.answer(f"❌ {detail}")
        elif resp.status_code == 400:
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
