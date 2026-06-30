from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.routers import auth, students, groups, tests, stats, attendance, users, results, rooms, materials
from app.models import room as _room_model        # noqa: F401 — table auto-create
from app.models import material as _material_model  # noqa: F401 — table auto-create

# Jadvallarni yaratish
Base.metadata.create_all(bind=engine)

# SQLite migration: late_minutes ustunini qo'shish (agar mavjud bo'lmasa)
try:
    with engine.connect() as conn:
        conn.execute(__import__("sqlalchemy").text(
            "ALTER TABLE attendances ADD COLUMN late_minutes INTEGER"
        ))
        conn.commit()
except Exception:
    pass  # ustun allaqachon mavjud

app = FastAPI(title="O'quv Markazi CRM", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],
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


@app.get("/api/health")
def health():
    return {"status": "ok"}
