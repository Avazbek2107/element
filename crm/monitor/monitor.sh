#!/bin/sh
# Backend /api/health'ni davriy tekshiradi. Holat o'zgarganda (sog'lom<->nosog'lom)
# TELEGRAM_BOT_TOKEN + ALERT_TELEGRAM_CHAT_ID orqali ogohlantirish yuboradi.
# Ikkalasi ham bo'sh bo'lsa — jim ishlaydi, faqat konsolga log yozadi.
set -u

STATE_FILE=/tmp/last_state
INTERVAL=${CHECK_INTERVAL_SECONDS:-300}
URL=${HEALTH_URL:-http://backend:8000/api/health}

send_alert() {
  msg="$1"
  if [ -n "${ALERT_TELEGRAM_CHAT_ID:-}" ] && [ -n "${TELEGRAM_BOT_TOKEN:-}" ]; then
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${ALERT_TELEGRAM_CHAT_ID}" -d "text=${msg}" -d "parse_mode=HTML" >/dev/null 2>&1
  fi
}

echo "up" > "$STATE_FILE"

while true; do
  if curl -sf -o /dev/null --max-time 10 "$URL"; then
    STATUS="up"
  else
    STATUS="down"
  fi

  PREV=$(cat "$STATE_FILE" 2>/dev/null || echo "up")
  if [ "$STATUS" != "$PREV" ]; then
    if [ "$STATUS" = "down" ]; then
      echo "[$(date -Iseconds)] OGOHLANTIRISH: backend javob bermayapti ($URL)"
      send_alert "🔴 <b>Element CRM</b>: backend javob bermayapti!"
    else
      echo "[$(date -Iseconds)] Backend tiklandi"
      send_alert "🟢 <b>Element CRM</b>: backend qayta ishga tushdi"
    fi
    echo "$STATUS" > "$STATE_FILE"
  fi

  sleep "$INTERVAL"
done
