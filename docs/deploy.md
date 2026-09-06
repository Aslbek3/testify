# Testify — ishlab chiqarishga joylashtirish (deploy)

Server: Ubuntu 24.04 VPS, PM2, Nginx (reverse proxy), mahalliy PostgreSQL.
Kod serverning o'zida klon qilinib build qilinadi (boshqa joyga
ko'chirilmaydi).

## 0. Talablar (server tomonida bir marta)

- **Node.js 20+ va npm** — Next.js 16 buning pastida ishlamaydi. PM2 yangi
  jarayonni `pm2 start` chaqirilgan paytdagi `node` (PATH) orqali ishga
  tushiradi — shu `node` 20+ ekanini tekshiring: `node -v`.
  Agar serverda eski tizim Node'i bilan bir qatorda boshqa Node versiyasi
  (nvm) ham bo'lsa, to'g'ri versiyani aniq belgilab ishga tushiring:
  `pm2 start ecosystem.config.js --interpreter $(which node)`.
- PostgreSQL (mahalliy o'rnatilgan)
- PM2 (`npm install -g pm2`)
- Nginx
- **Bo'sh port tanlang.** VPS'da bir nechta web loyiha bitta portlar
  oralig'ida ishlayotgan bo'lishi mumkin — `ss -tulnp` bilan band
  portlarni tekshirib, `ecosystem.config.js` dagi `PORT` ni mos ravishda
  o'zgartiring (namunada `3214` ishlatilgan, 3100 dan boshlab tanlangan).

## 1. Birinchi o'rnatish

### 1.1 PostgreSQL bazasi va foydalanuvchi

```bash
sudo -u postgres psql <<'SQL'
CREATE USER testify_prod WITH PASSWORD 'kuchli-tasodifiy-parol';
CREATE DATABASE testify_prod OWNER testify_prod;
SQL
```

### 1.2 Kod va bog'liqliklar

```bash
git clone https://github.com/Aslbek3/testify.git testify
cd testify
npm ci
```

### 1.3 .env to'ldirish

```bash
cp .env.example .env
```

- `DATABASE_URL` / `DIRECT_URL` — mahalliy PostgreSQL uchun ikkalasi bir
  xil bo'lishi mumkin: `postgresql://testify_prod:parol@localhost:5432/testify_prod`
- `JWT_SECRET` — uzun, tasodifiy qator:
  ```bash
  openssl rand -base64 48
  ```

### 1.4 Migratsiya, build, owner hisobi

```bash
# Migratsiyalarni qo'llash — FAQAT "deploy", "dev" EMAS (pastdagi ogohlantirishga qarang)
npx prisma migrate deploy

# Build
npm run build

# Birinchi App Owner hisobini yaratish
OWNER_EMAIL="owner@testif.gt.tc" OWNER_NAME="Ism Familiya" \
  OWNER_PASSWORD="$(openssl rand -base64 24)" npm run create-owner
# Ekranda chiqqan email/parolni xavfsiz joyga yozib qo'ying — qayta
# ko'rsatilmaydi. Keyinroq qo'shimcha owner kerak bo'lsa, shu buyruqni
# boshqa OWNER_EMAIL bilan qayta ishlatavering.

mkdir -p logs backups
```

### 1.5 PM2 orqali ishga tushirish

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # server qayta yuklanganda avtomatik ishga tushishi uchun,
              # chiqqan buyruqni ko'rsatilganidek ishga tushiring
```

> **MUHIM: `prisma migrate dev` ishlab chiqarishda HECH QACHON ishlatilmaydi.**
> `migrate dev` ma'lumotlar sxemasini interaktiv tekshiradi va nomuvofiqlik
> bo'lsa bazani **reset qilib, barcha ma'lumotni o'chirib yuborishi** mumkin.
> Productionda faqat `prisma migrate deploy` ishlatiladi — u faqat
> qo'llanilmagan migratsiyalarni tartib bilan qo'llaydi, hech narsani
> o'chirmaydi va interaktiv emas. **Migratsiyadan oldin albatta
> `./scripts/backup.sh` ishga tushiring.**

> **`prisma/seed.ts` ishlab chiqarishda ishlatilmaydi.** Seed skripti faqat
> lokal/dev baza uchun demo test hisoblari va DEMO savollar (`testify123`
> paroli bilan) yaratadi — bular productionga hech qachon shu holicha
> ko'chirilmaydi. Production foydalanuvchilari tegishli ro'yxatdan
> o'tkazish oqimlari orqali qo'lda yaratiladi.

> **`.env` hech qachon git'ga qo'shilmaydi** — `.gitignore` da `.env*`
> (faqat `.env.example` istisno) borligini tekshiring.

## 2. Yangilash (update) qadamlari

```bash
cd testify
./scripts/backup.sh   # migratsiyadan oldin har doim backup
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 reload testify
```

`pm2 reload` (restart emas) — jarayonni yumshoq qayta ishga tushiradi,
so'rovlar tayyor bo'lguncha kutadi.

## 3. Nginx reverse proxy

To'liq izohlangan namuna: [`docs/nginx.conf.example`](./nginx.conf.example)
— `/etc/nginx/sites-available/testify` ga nusxalab, `sites-enabled` ga
symlink qiling.

Qisqacha ta'kid: proxy qatoridagi to'rtta `proxy_set_header` (`X-Real-IP`,
`X-Forwarded-For`, `X-Forwarded-Proto`, `Host`) **majburiy** —
`src/app/api/auth/login/route.ts` login urinishlarini cheklash uchun
`X-Real-IP` sarlavhasiga ishonadi; agar Nginx uni `$remote_addr` bilan
majburan qayta yozmasa, hujumchi shu sarlavhani o'zi yuborib rate
limitni butunlay chetlab o'tadi.

HTTPS uchun (DNS to'g'ri yo'naltirilgach): `certbot --nginx -d testif.gt.tc`

## 4. Health check

`GET /api/health` — sessiya talab qilmaydi:

- Baza ishlayotgan bo'lsa: `200 { "status": "ok", "db": "ok" }`
- Baza bilan bog'lanib bo'lmasa: `503 { "status": "error", "db": "error" }`

Javobda hech qanday maxfiy ma'lumot (xato matni, ulanish satri, versiya)
chiqmaydi — xato tafsilotlari faqat serverdagi structured logga yoziladi
(`src/lib/logger.ts` orqali). Buni uptime monitoring (masalan cron +
curl, yoki tashqi monitoring xizmati) bilan kuzatib turing.

## 5. Loglar

- PM2 stdout/stderr: `logs/out.log`, `logs/error.log` (`ecosystem.config.js`
  da belgilangan).
- Barcha API route xatolari va client (`error.tsx`) xatolari
  `src/lib/logger.ts` orqali bitta qatorli structured JSON ko'rinishida
  yoziladi: `{ level, time, path, userId, message, stack }`. Parol, token
  kabi maxfiy maydonlar avtomatik `"[REDACTED]"` bilan almashtiriladi.
- Ko'rish: `pm2 logs testify` yoki `tail -f logs/error.log`.

## 6. Baza zaxirasi (backup) va tiklash (restore)

### Avtomatik kunlik zaxira

`scripts/backup.sh` — `pg_dump` orqali bazani gzip qilib
`backups/testify_<sana>.sql.gz` nomida saqlaydi, 14 kundan eski
fayllarni avtomatik o'chiradi.

Cron'ga qo'shish (har kuni soat 03:00):

```bash
crontab -e
# quyidagi qatorni qo'shing:
0 3 * * * /root/vps/projects/web/testify/scripts/backup.sh >> /root/vps/projects/web/testify/logs/backup.log 2>&1
```

Qo'lda ishga tushirish: `./scripts/backup.sh`

### Tiklash (restore)

```bash
# 1. Ilovani to'xtatish (yozishni oldini olish uchun)
pm2 stop testify

# 2. Zaxirani tanlash va tiklash
gunzip -c backups/testify_2026-09-06_030000.sql.gz | psql "$DATABASE_URL"

# 3. Ilovani qayta ishga tushirish
pm2 start testify
```

> Tiklashdan oldin joriy bazani ham zaxiralab qo'ying
> (`./scripts/backup.sh`) — ehtiyot chorasi sifatida.

## 7. Ishga tushirgandan keyin tekshiruv ro'yxati

- [ ] `curl -i https://testif.gt.tc/api/health` → `200 {"status":"ok","db":"ok"}`
- [ ] Login sahifasida to'g'ri email/parol bilan kirish ishlayapti
- [ ] Login sahifasida **noto'g'ri** parol bilan 10 marta urinilganda
      11-chi urinish `429` qaytaradi (`checkRateLimit`, IP bo'yicha)
- [ ] `https://testif.gt.tc` HTTPS bilan ochilyapti, sertifikat amal
      qilmoqda (`certbot certificates`)
- [ ] `pm2 logs testify --lines 50` da kutilmagan xato yo'q
- [ ] `pm2 describe testify` da `status: online`, restart soni past
- [ ] `./scripts/backup.sh` qo'lda ishga tushirilib, `backups/` ichida
      yangi `.sql.gz` fayl paydo bo'lgani tekshirildi
