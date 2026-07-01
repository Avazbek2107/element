from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.routers import auth, students, groups, tests, stats, attendance, users, results, rooms, materials, ai, telegram, payments, assessments, superadmin
from app.models import room as _room_model        # noqa: F401 — table auto-create
from app.models import material as _material_model  # noqa: F401 — table auto-create
from app.models import payment as _payment_model  # noqa: F401 — table auto-create
from app.models import assessment as _assessment_model  # noqa: F401 — table auto-create

# Jadvallarni yaratish
Base.metadata.create_all(bind=engine)

_text = __import__("sqlalchemy").text
_migrations = [
    "ALTER TABLE attendances ADD COLUMN late_minutes INTEGER",
    "ALTER TABLE attendances ADD COLUMN module_id INTEGER REFERENCES modules(id) ON DELETE SET NULL",
    "ALTER TABLE attendances ADD COLUMN topic_id  INTEGER REFERENCES topics(id)  ON DELETE SET NULL",
    "ALTER TYPE attendancestatus ADD VALUE IF NOT EXISTS 'excused'",
    "ALTER TABLE student_profiles ADD COLUMN link_code VARCHAR(12)",
    "CREATE UNIQUE INDEX IF NOT EXISTS ix_student_profiles_link_code ON student_profiles(link_code)",
    "ALTER TABLE student_profiles ADD COLUMN student_link_code VARCHAR(12)",
    "CREATE UNIQUE INDEX IF NOT EXISTS ix_student_profiles_student_link_code ON student_profiles(student_link_code)",
    "ALTER TABLE tests ADD COLUMN answer_key VARCHAR(500)",
    "CREATE INDEX IF NOT EXISTS ix_payments_month_year ON payments(month, year)",
    "CREATE INDEX IF NOT EXISTS ix_payments_student_id ON payments(student_id)",
    "CREATE UNIQUE INDEX IF NOT EXISTS ix_assessments_student_group_date ON assessments(student_id, group_id, date)",
    # Performance indexes
    "CREATE INDEX IF NOT EXISTS ix_attendances_group_date ON attendances(group_id, date)",
    "CREATE INDEX IF NOT EXISTS ix_attendances_student_id ON attendances(student_id)",
    "CREATE INDEX IF NOT EXISTS ix_student_profiles_group_id ON student_profiles(group_id)",
    "CREATE INDEX IF NOT EXISTS ix_users_is_active ON users(is_active)",
    # super_admin roli va permissions ustuni
    "ALTER TABLE users ADD COLUMN permissions JSONB",
]

# super_admin enum qiymatini autocommit rejimida qo'shish
try:
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as _ac:
        _ac.execute(_text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'admin'"))
except Exception:
    pass
for _sql in _migrations:
    try:
        with engine.connect() as _conn:
            _conn.execute(_text(_sql))
            _conn.commit()
    except Exception:
        pass

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


@app.on_event("startup")
async def _start_scheduler():
    _asyncio.create_task(_report_scheduler())
