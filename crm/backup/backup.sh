#!/bin/sh
# Har BACKUP_INTERVAL_HOURS soatda pg_dump oladi, RETENTION_DAYS kundan eskilarini o'chiradi.
#
# Tiklash (restore) uchun:
#   gunzip -c /backups/crm_db_YYYYMMDD_HHMMSS.sql.gz | psql -U crm_user -d crm_db -h db
set -eu

mkdir -p /backups
INTERVAL_SECONDS=$(( ${BACKUP_INTERVAL_HOURS:-24} * 3600 ))
RETENTION_DAYS=${RETENTION_DAYS:-14}

while true; do
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  FILE="/backups/crm_db_${TIMESTAMP}.sql.gz"

  echo "[$(date -Iseconds)] Backup boshlanmoqda: $FILE"
  if pg_dump | gzip > "$FILE"; then
    echo "[$(date -Iseconds)] Backup muvaffaqiyatli: $(du -h "$FILE" | cut -f1)"
  else
    echo "[$(date -Iseconds)] XATO: backup muvaffaqiyatsiz tugadi" >&2
    rm -f "$FILE"
  fi

  echo "[$(date -Iseconds)] $RETENTION_DAYS kundan eski backuplar o'chirilmoqda..."
  find /backups -name "crm_db_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete

  sleep "$INTERVAL_SECONDS"
done
