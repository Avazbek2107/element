#!/bin/sh
set -e

echo "⏳ PostgreSQL tayyor bo'lishini kutish..."
until python -c "
import psycopg2, os
psycopg2.connect(os.environ['DATABASE_URL'])
print('✅ PostgreSQL tayyor!')
" 2>/dev/null; do
  sleep 1
done

echo "📦 Jadvallar yaratilmoqda..."
python -c "from app.database import Base, engine; Base.metadata.create_all(bind=engine)"

echo "👤 Admin foydalanuvchi tekshirilmoqda..."
python create_admin.py

echo "🚀 Server ishga tushmoqda..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
