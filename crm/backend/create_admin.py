"""
Birinchi super_admin foydalanuvchini yaratish / yangilash uchun ishga tushiriladi.
Jadval sxemasi bu vaqtga kelib Alembic orqali (entrypoint.sh) allaqachon tayyor bo'ladi.
"""
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.utils.auth import hash_password

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
