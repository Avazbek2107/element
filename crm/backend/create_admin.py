"""
Birinchi admin foydalanuvchini yaratish uchun bir marta ishga tushiring:
  python create_admin.py
"""
from app.database import SessionLocal, Base, engine
from app.models.user import User, UserRole
from app.utils.auth import hash_password

Base.metadata.create_all(bind=engine)

db = SessionLocal()

if db.query(User).filter(User.username == "admin").first():
    print("Admin allaqachon mavjud!")
else:
    admin = User(
        username="admin",
        email="admin@crm.uz",
        password_hash=hash_password("admin123"),
        first_name="Admin",
        last_name="CRM",
        role=UserRole.admin,
    )
    db.add(admin)

    teacher = User(
        username="teacher",
        email="teacher@crm.uz",
        password_hash=hash_password("teacher123"),
        first_name="O'qituvchi",
        last_name="Namuna",
        role=UserRole.teacher,
    )
    db.add(teacher)

    db.commit()
    print("✅ Foydalanuvchilar yaratildi:")
    print("   Admin    — login: admin    | parol: admin123")
    print("   Teacher  — login: teacher  | parol: teacher123")

db.close()
