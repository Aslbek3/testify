# Testify

Avtomaktablar uchun obuna asosidagi PDD test tayyorgarlik SaaS platformasi.
4 rol: App Owner, Direktor, Ustoz, O'quvchi. Loyiha konteksti va arxitektura
qoidalari uchun [CLAUDE.md](./CLAUDE.md) ga qarang.

## Stack

- Next.js 16 (App Router) + TypeScript
- PostgreSQL + Prisma ORM (`6.19.3` — ataylab pinlangan, v7 hali beqaror
  va majburiy driver-adapter modelini talab qiladi)
- Tailwind CSS v4

## Ishga tushirish (local development)

1. Bog'liqliklarni o'rnating:

   ```bash
   npm install
   ```

2. `.env.example`dan `.env` yarating va o'zingizning ma'lumotlaringizni kiriting:

   ```bash
   cp .env.example .env
   ```

   - `DATABASE_URL` — Postgres ulanish satri. Rivojlantirish uchun bepul
     bulutli Postgres (masalan [Neon](https://neon.tech)) tavsiya etiladi.
   - `DIRECT_URL` — agar provayderingiz pooler (masalan Neon'ning
     "-pooler" manzili) ishlatsa, bu yerga **pooler'siz** to'g'ridan-to'g'ri
     ulanish satrini qo'ying (migratsiyalar shu orqali ishlaydi). Oddiy
     local Postgres uchun `DIRECT_URL` xuddi `DATABASE_URL` bilan bir xil
     bo'lishi mumkin.
   - `JWT_SECRET` — istalgan uzun tasodifiy satr (masalan
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

3. Sxemani bazaga qo'llang:

   ```bash
   npx prisma migrate dev
   ```

4. Rivojlantirish serverini ishga tushiring:

   ```bash
   npm run dev
   ```

   [http://localhost:3000](http://localhost:3000) manzilida oching.

## VPS'ga joylashtirish (production)

Production'da **`prisma migrate dev` ishlatilmaydi** — u yangi migratsiya
yaratishga mo'ljallangan va interaktiv. Buning o'rniga mavjud migratsiya
fayllarini qo'llaydigan buyruq ishlatiladi:

1. VPS'da PostgreSQL o'rnating va bo'sh baza yarating.
2. Repozitoriyni serverga klonlang, `npm install` qiling (bu `postinstall`
   orqali avtomatik `prisma generate` ham ishga tushiradi).
3. `.env` faylida `DATABASE_URL`ni (va agar kerak bo'lsa `DIRECT_URL`ni)
   VPS'dagi local Postgre'ga yo'naltiring — masalan:

   ```
   DATABASE_URL="postgresql://testify:parol@localhost:5432/testify"
   DIRECT_URL="postgresql://testify:parol@localhost:5432/testify"
   ```

4. Migratsiyalarni qo'llang (mavjud fayllarni ishlatadi, yangi yaratmaydi):

   ```bash
   npx prisma migrate deploy
   ```

5. Loyihani build qilib ishga tushiring:

   ```bash
   npm run build
   npm run start
   ```

Neon'dan local Postgre'ga (yoki aksincha) o'tish kod o'zgarishini talab
qilmaydi — faqat `.env`dagi ulanish satrlarini almashtirib, `migrate deploy`
ni qayta ishga tushirish kifoya, chunki Prisma sxemasi va barcha
query'lar standart `postgresql` provideriga yozilgan.

## Foydali buyruqlar

| Buyruq | Vazifasi |
|---|---|
| `npm run dev` | Rivojlantirish serveri (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Production serverni ishga tushirish |
| `npx prisma studio` | Ma'lumotlar bazasini brauzerda ko'rish |
| `npx prisma migrate dev --name <nom>` | Yangi migratsiya yaratish (faqat dev) |
| `npx prisma migrate deploy` | Mavjud migratsiyalarni qo'llash (production) |
