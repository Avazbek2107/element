#!/bin/sh
set -e

echo "PostgreSQL tayyor bo'lishini kutish..."
until python -c "
import psycopg2, os
psycopg2.connect(os.environ['DATABASE_URL'])
print('PostgreSQL tayyor!')
" 2>/dev/null; do
  sleep 1
done

echo "Sxema holati tekshirilmoqda..."
NEEDS_STAMP=$(python -c "
import psycopg2, os
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
cur.execute(\"SELECT to_regclass('public.alembic_version'), to_regclass('public.users')\")
alembic_tbl, users_tbl = cur.fetchone()
print('yes' if alembic_tbl is None and users_tbl is not None else 'no')
conn.close()
")

if [ "$NEEDS_STAMP" = "yes" ]; then
  echo "Alembic'dan oldingi baza aniqlandi — joriy holat 'head' deb belgilanmoqda (DDL qayta ishlamaydi)..."
  alembic stamp head
fi

echo "Migratsiyalar qo'llanilmoqda..."
alembic upgrade head

echo "Admin foydalanuvchi tekshirilmoqda..."
python create_admin.py

echo "Server ishga tushmoqda..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
