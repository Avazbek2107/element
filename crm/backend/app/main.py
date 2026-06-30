from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.routers import auth, students, groups, tests

# Jadvallarni yaratish
Base.metadata.create_all(bind=engine)

app = FastAPI(title="O'quv Markazi CRM", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(students.router)
app.include_router(groups.router)
app.include_router(tests.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
