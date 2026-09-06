#!/usr/bin/env bash
# Testify PostgreSQL bazasini kunlik zaxiralaydi (gzip bilan siqib,
# sana bilan nomlab) va 14 kundan eski fayllarni avtomatik o'chiradi.
#
# Cron namunasi (har kuni soat 03:00 da, VPS lokal vaqti bo'yicha):
#   0 3 * * * /root/vps/projects/web/testify/scripts/backup.sh >> /root/vps/projects/web/testify/logs/backup.log 2>&1
#
# Tiklash (restore) qadamlari uchun docs/deploy.md ga qarang.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"
RETENTION_DAYS=14
TIMESTAMP="$(date +%Y-%m-%d_%H%M%S)"
FILE="$BACKUP_DIR/testify_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

if [ -z "${DATABASE_URL:-}" ] && [ -f "$PROJECT_DIR/.env" ]; then
  # .env faylidan faqat DATABASE_URL qatorini o'qiydi, boshqa
  # o'zgaruvchilarga (JWT_SECRET va h.k.) tegmaydi.
  DATABASE_URL="$(grep -m1 '^DATABASE_URL=' "$PROJECT_DIR/.env" | cut -d '=' -f2- | tr -d '"')"
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "XATO: DATABASE_URL topilmadi (.env faylida yoki muhit o'zgaruvchisi orqali bering)" >&2
  exit 1
fi

pg_dump "$DATABASE_URL" | gzip > "$FILE"
echo "Zaxira yaratildi: $FILE"

find "$BACKUP_DIR" -name "testify_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
