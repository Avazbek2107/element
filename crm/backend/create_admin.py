"""
Birinchi super_admin foydalanuvchini yaratish / yangilash uchun ishga tushiriladi.
"""
from sqlalchemy import text
from app.database import SessionLocal, Base, engine
from app.models.user import User, UserRole
from app.models import group, student, attendance, material, room, test
from app.utils.auth import hash_password

# 1. super_admin enum qiymatini qo'shish (AUTOCOMMIT kerak)
try:
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as _c:
        _c.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'admin'"))
except Exception:
    pass

# 2. permissions ustunini qo'shish
try:
    with engine.connect() as _c:
        _c.execute(text("ALTER TABLE users ADD COLUMN permissions JSONB"))
        _c.commit()
except Exception:
    pass

Base.metadata.create_all(bind=engine)

db = SessionLocal()

existing = db.query(User).filter(User.username == "admin").first()
if existing:
    if existing.role != UserRole.super_admin:
        existing.role = UserRole.super_admin
        db.commit()
        print("✅ admin → super_admin ga yangilandi")
    else:
        print("Super admin allaqachon mavjud!")
else:
    admin = User(
        username="admin",
        email="admin@crm.uz",
        password_hash=hash_password("admin123"),
        first_name="Super",
        last_name="Admin",
        role=UserRole.super_admin,
    )
    db.add(admin)
    db.commit()
    print("✅ Super admin yaratildi:")
    print("   login: admin | parol: admin123")

db.close()
