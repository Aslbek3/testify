#!/usr/bin/env bash
# Testify PostgreSQL bazasini kunlik zaxiralaydi (gzip bilan siqib,
# sana bilan nomlab) va 14 kundan eski fayllarni avtomatik o'chiradi.
# To'lov cheklarini (storage/receipts) ham alohida nusxalaydi — ular
# bazada emas, diskda saqlanadi va pg_dump ularni o'z ichiga olmaydi.
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

# ---- To'lov cheklari ----
#
# Cheklar bazada emas, diskda (`src/lib/receiptStorage.ts`). Bazadagi
# yozuv chekka ishora qiladi — faqat baza tiklansa, direktor "Chekni
# ochish" ni bosganda fayl topilmaydi.
#
# Har kuni to'liq arxiv EMAS, yig'iladigan nusxa (mirror): cheklar faqat
# qo'shiladi, o'zgarmaydi. 14 kunlik to'liq arxiv esa bir necha oyda
# cheklar hajmining 14 barobarini egallardi. `--delete` ATAYLAB yo'q —
# asl papkadan tasodifan o'chirilgan chek zaxirada qoladi.
RECEIPTS_DIR="${RECEIPTS_DIR:-}"
if [ -z "$RECEIPTS_DIR" ] && [ -f "$PROJECT_DIR/.env" ]; then
  RECEIPTS_DIR="$(grep -m1 '^RECEIPTS_DIR=' "$PROJECT_DIR/.env" | cut -d '=' -f2- | tr -d '"' || true)"
fi
RECEIPTS_DIR="${RECEIPTS_DIR:-$PROJECT_DIR/storage/receipts}"

if [ -d "$RECEIPTS_DIR" ]; then
  mkdir -p "$BACKUP_DIR/receipts"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a "$RECEIPTS_DIR/" "$BACKUP_DIR/receipts/"
  else
    cp -an "$RECEIPTS_DIR/." "$BACKUP_DIR/receipts/"
  fi
  echo "Cheklar nusxalandi: $BACKUP_DIR/receipts ($(find "$BACKUP_DIR/receipts" -type f | wc -l) ta fayl)"
else
  echo "Cheklar papkasi hali yo'q ($RECEIPTS_DIR) — o'tkazib yuborildi"
fi
