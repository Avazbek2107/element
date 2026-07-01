from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.routers import auth, students, groups, tests, stats, attendance, users, results, rooms, materials, ai, telegram
from app.models import room as _room_model        # noqa: F401 — table auto-create
from app.models import material as _material_model  # noqa: F401 — table auto-create

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
    # Performance indexes
    "CREATE INDEX IF NOT EXISTS ix_attendances_group_date ON attendances(group_id, date)",
    "CREATE INDEX IF NOT EXISTS ix_attendances_student_id ON attendances(student_id)",
    "CREATE INDEX IF NOT EXISTS ix_student_profiles_group_id ON student_profiles(group_id)",
    "CREATE INDEX IF NOT EXISTS ix_users_is_active ON users(is_active)",
]
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
    allow_origins=["*"] if not _CORS_ORIGINS else _DEFAULT_ORIGINS + _CORS_ORIGINS,
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


@app.get("/api/health")
def health():
    return {"status": "ok"}
