from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, students, groups, tests, stats, attendance, users, results, rooms, materials, ai, telegram, payments, assessments, superadmin, audit, messages
import app.models  # noqa: F401 — barcha modellarni ro'yxatdan o'tkazish (Alembic autogenerate uchun ham kerak)
from app.config import settings

# Jadval sxemasi endi Alembic orqali boshqariladi (ishga tushishda entrypoint.sh
# "alembic upgrade head" ni chaqiradi) — bu yerda create_all/xom SQL migratsiya yo'q.

if settings.SENTRY_DSN:
    import sentry_sdk
    sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.1, send_default_pii=False)

app = FastAPI(title="O'quv Markazi CRM", version="1.0.0")

import os as _os

_CORS_ORIGINS = _os.getenv("ALLOWED_ORIGINS", "").split(",") if _os.getenv("ALLOWED_ORIGINS") else []
_DEFAULT_ORIGINS = ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_DEFAULT_ORIGINS + _CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(students.router)
app.include_router(groups.router)
app.include_router(tests.router)
app.include_router(stats.router)
app.include_router(attendance.router)
app.include_router(users.router)
app.include_router(results.router)
app.include_router(rooms.router)
app.include_router(materials.router)
app.include_router(ai.router)
app.include_router(telegram.router)
app.include_router(payments.router)
app.include_router(assessments.router)
app.include_router(superadmin.router)
app.include_router(audit.router)
app.include_router(messages.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


import asyncio as _asyncio
from datetime import datetime as _datetime, date as _date

async def _report_scheduler():
    """Every minute: send group report to parents if scheduled time matches."""
    while True:
        await _asyncio.sleep(60)
        try:
            now = _datetime.now()
            today = _date.today()

            from app.database import SessionLocal
            from app.models.assessment import Assessment as _Ass, GroupReportSchedule as _Sched
            from app.models.student import StudentProfile as _SP
            from app.models.group import Group as _Grp
            from sqlalchemy.orm import joinedload as _jl
            from app.utils.notify import send_telegram_message as _send, _progress_bar as _bar

            db = SessionLocal()
            try:
                schedules = db.query(_Sched).filter(
                    _Sched.is_active   == True,
                    _Sched.send_hour   == now.hour,
                    _Sched.send_minute == now.minute,
                ).all()

                for sched in schedules:
                    if sched.last_sent_date == today:
                        continue
                    group = db.query(_Grp).filter(_Grp.id == sched.group_id).first()
                    group_name = group.name if group else ""
                    recs = (
                        db.query(_Ass)
                        .options(_jl(_Ass.student).joinedload(_SP.user))
                        .filter(_Ass.group_id == sched.group_id, _Ass.date == today)
                        .all()
                    )
                    for a in recs:
                        if not a.student or not a.student.parent_telegram_id:
                            continue
                        sname = f"{a.student.user.first_name} {a.student.user.last_name}" if a.student.user else ""
                        parts = []
                        if a.qa_correct is not None and a.qa_total:
                            p = round(a.qa_correct / a.qa_total * 100)
                            parts.append(f"📝 <b>Savol-javob:</b> {a.qa_correct}/{a.qa_total} = {p}%\n<code>{_bar(p)}</code>")
                        if a.test_correct is not None and a.test_total:
                            p = round(a.test_correct / a.test_total * 100)
                            parts.append(f"🧪 <b>Test:</b> {a.test_correct}/{a.test_total} = {p}%\n<code>{_bar(p)}</code>")
                        if a.activity_score is not None:
                            p = round(a.activity_score / 10 * 100)
                            parts.append(f"⭐ <b>Faollik:</b> {a.activity_score}/10 = {p}%\n<code>{_bar(p)}</code>")
                        if not parts:
                            continue
                        msg = f"📊 <b>Dars hisoboti</b>\n📅 {today}  |  📚 {group_name}\n👤 <b>{sname}</b>\n━━━━━━━━━━━━━━━━━━\n\n" + "\n\n".join(parts)
                        _send(a.student.parent_telegram_id, msg)
                    sched.last_sent_date = today
                    db.commit()
            finally:
                db.close()
        except Exception:
            pass


REMINDER_DAYS_BEFORE_MONTH_END = 5
REMINDER_THROTTLE_DAYS = 3


async def _payment_reminder_scheduler():
    """Har kuni bir marta: oy oxiriga N kun qolganda yoki qarzdorlik bo'lsa ota-onaga eslatma."""
    import calendar as _calendar

    while True:
        await _asyncio.sleep(60)
        try:
            now = _datetime.now()
            if not (now.hour == 10 and now.minute == 0):
                continue
            today = _date.today()

            from app.database import SessionLocal
            from app.models.payment import Payment as _Payment, PaymentStatus as _PayStatus
            from app.models.student import StudentProfile as _SP
            from app.utils.messaging import deliver_to_parent as _deliver

            db = SessionLocal()
            try:
                days_in_month = _calendar.monthrange(today.year, today.month)[1]
                days_left = days_in_month - today.day
                due_soon = days_left <= REMINDER_DAYS_BEFORE_MONTH_END

                q = db.query(_Payment).filter(_Payment.status.in_([_PayStatus.pending, _PayStatus.partial]))
                candidates = []
                for p in q.all():
                    is_current_month = (p.year == today.year and p.month == today.month)
                    is_overdue = (p.year, p.month) < (today.year, today.month)
                    if not ((is_current_month and due_soon) or is_overdue):
                        continue
                    if p.last_reminder_at and (today - p.last_reminder_at).days < REMINDER_THROTTLE_DAYS:
                        continue
                    candidates.append(p)

                for p in candidates:
                    student = db.query(_SP).filter(_SP.id == p.student_id).first()
                    if not student:
                        continue
                    owed = float(p.amount) - float(p.paid_amount)
                    month_label = f"{p.month:02d}.{p.year}"
                    text = (
                        f"💳 <b>To'lov eslatmasi</b>\n\n"
                        f"{month_label} oyi uchun <b>{owed:,.0f} so'm</b> qarzdorlik mavjud.\n"
                        f"Iltimos, imkon qadar tez to'lovni amalga oshiring."
                    )
                    channel, status = _deliver(student, text)
                    from app.models.message import Message as _Msg
                    db.add(_Msg(
                        sender_id=None, recipient_student_id=student.id,
                        channel=channel, body=text, status=status,
                    ))
                    p.last_reminder_at = today
                db.commit()
            finally:
                db.close()
        except Exception:
            pass


@app.on_event("startup")
async def _start_scheduler():
    _asyncio.create_task(_report_scheduler())
    _asyncio.create_task(_payment_reminder_scheduler())
