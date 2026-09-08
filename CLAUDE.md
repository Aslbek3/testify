# Testify — loyiha konteksti

## Nima bu
Avtomaktablar uchun obuna asosidagi PDD (haydovchilik) test tayyorgarlik 
SaaS platformasi. 4 darajali rol tizimi bor.

## Stack
- Next.js 14+ (App Router), TypeScript — frontend va backend (API routes) 
  bitta loyihada
- PostgreSQL + Prisma ORM
- Tailwind CSS

## Rollar (ierarxik)
1. App Owner — barcha tashkilotlarni (avtomaktablarni) boshqaradi
2. Direktor — bitta tashkilot ichidagi ustozlar va guruhlarni ko'radi
3. Ustoz (Tutor) — o'z guruhidagi o'quvchilarni va ularning progressini ko'radi
4. O'quvchi (Student) — o'z natijalari va progressini ko'radi

## Auth
Hozircha email + parol (bcrypt hash). Kelajakda telefon+SMS OTP qo'shiladi — 
shuning uchun User modelida `phone` maydoni ham bo'lsin (hozir ishlatilmasa ham).

## Dizayn qoidasi
Standart AI-generatsiya uslubidan (krem fon+terracotta rang, bir xil radiusli 
kartochkalar, ALL CAPS yorliqlar) qat'iyan qoch. Flat, professional, 
funksional dizayn. Rang va shrift tokenlari alohida promptda beriladi.

## Umumiy qoida
Har bir katta qadamdan oldin qisqacha reja yoz, tasdiqlanmaguncha davom etma. 
Oddiy va soddadan boshla, keraksiz murakkablik kiritma.

## Arxitektura qoidalari

Qatlamlar bir yo'nalishda bog'liq: **API route → service → Prisma**. 
Route'lar hech qachon to'g'ridan-to'g'ri Prisma'ga murojaat qilmaydi.



Qoidalar:
- **Har bir API route** boshida `permissions.ts` orqali tekshiruv bo'lishi shart — 
  tekshiruvsiz route yozilmaydi.
- Route'lar Prisma'ni bevosita chaqirmaydi — faqat `services/` funksiyalarini chaqiradi. 
  Prisma import'i faqat `services/` va `lib/prisma.ts` ichida bo'ladi.
- Bir xil kod (jadval render qilish, xato xabari, sana formatlash va h.k.) ikki joyda 
  qayta yozilmaydi — umumiy funksiya (`lib/`) yoki komponentga (`components/`) chiqariladi.

## Test hisoblari (faqat lokal dev baza — seed skript, `prisma/seed.ts`)

Parol hammasida bir xil: **testify123**

| Rol | Email |
|---|---|
| App Owner | owner@testify.dev |
| Direktor | director@testify.dev |
| Ustoz | tutor@testify.dev |
| O'quvchi | student1@testify.dev ... student8@testify.dev |

Bular faqat rivojlantirish (Neon dev) bazasidagi test ma'lumotlari — 
production'ga hech qachon shu holicha ko'chirilmaydi.

## Production (VPS deploy holati)

- **Papka**: `/root/vps/projects/web/testify/` (VPS'dagi asosiy `CLAUDE.md`
  jadvaliga qo'shilgan)
- **PM2 nomi**: `testify` — `ecosystem.config.js` orqali, FORK rejimida
  (sabab: `src/lib/rateLimit.ts` xotirada ishlaydi)
- **Ishga tushirish usuli (2026-09-06 kechqurun o'zgartirildi)**: PM2
  `script: "npm", args: "start -- -H 127.0.0.1"` orqali oddiy `next start`
  ishlatadi — eski `.next/standalone/server.js` + qo'lda public/static
  nusxalash usuli olib tashlandi (`next.config.ts`dagi `output:
  "standalone"` ham olib tashlandi), chunki kod serverning o'zida build
  qilinadi, boshqa joyga ko'chirilmaydi. ⚠️ `-H 127.0.0.1` MAJBURIY —
  aks holda `next start` `0.0.0.0`ga bog'lanib, portni UFW whitelist
  qilingan admin IP'lariga bevosita (Nginx'ni chetlab o'tib) ochib
  qo'yadi.
- **Port**: `127.0.0.1:3214` (3000, 3210-3213 boshqa loyihalarda band)
- **Node**: tizim standart Node'i (v12) juda eski — Node 20+ shart.
  `ecosystem.config.js` `nvm` orqali o'rnatilgan Node 22 binariga aniq
  yo'l bilan ishga tushirilgan (`pm2 start ecosystem.config.js
  --interpreter $(which node)`, nvm v22.23.1 muhitida). Agar `pm2
  resurrect`/reboot'dan keyin `testify` crash-loop qilsa — birinchi
  sabab shu (interpreter yo'li noto'g'ri bo'lib qolishi).
- **Domen**: `testif.duckdns.org` (2026-09-06 da `testif.gt.tc`dan
  o'tkazildi — gt.tc DNS bu VPS'ga hech qachon ko'rsatilmagan edi,
  `185.27.134.212`ga ko'rsatib turardi; duckdns.org boshqa loyihalar
  kabi to'g'ridan-to'g'ri shu VPS'ga ishlaydi). Nginx site:
  `/etc/nginx/sites-available/testify` (`server_name
  testif.duckdns.org`, `sites-enabled`ga symlink qilingan), SSL
  certbot orqali o'rnatilgan (`/etc/letsencrypt/live/testif.duckdns.org/`).
  Namuna: `docs/nginx.conf.example` (izohlar bilan — nima uchun
  `X-Real-IP`ni Nginx qayta yozishi shart, `client_max_body_size`).
  **2026-09-08 da qayta tekshirildi**: `testif.duckdns.org` DNS A-yozuvi
  shu VPS'ning IPv4'iga (`161.97.105.98`) to'g'ri ko'rsatadi; port 80
  so'rovi Certbot boshqaruvidagi qoida bilan `301`ga HTTPS'ga
  yo'naltiradi; sertifikat amal qiladi (muddati 2026-12-05); **https://testif.duckdns.org**
  `200 OK` bilan ochiladi.
- **Baza**: mahalliy PostgreSQL, DB `testify_prod`, user `testify_prod`
  (parol faqat serverdagi `.env` da, git'ga tushmaydi).
- **App Owner hisobi**: `owner@testif.gt.tc` (2026-09-06 da yaratilgan —
  parol faqat o'sha paytda Aslbekka Telegram/terminal orqali bir marta
  ko'rsatilgan, hech qayerda saqlanmagan; unutilsa DB'da bevosita
  `passwordHash` yangilanadi). Qo'shimcha owner kerak bo'lsa:
  `npm run create-owner` (`scripts/create-owner.ts`, `OWNER_EMAIL` /
  `OWNER_NAME` / `OWNER_PASSWORD` orqali).
- **Health check**: `GET /api/health` — sessiya talab qilmaydi.
- **Xato logging**: `src/lib/logger.ts` — barcha API route va `error.tsx`
  xatolari structured JSON qatorida PM2 logiga yoziladi, parol/token
  avtomatik `[REDACTED]`.
- **Zaxira**: `scripts/backup.sh`, cron'ga qo'shilgan (`crontab -l`) — har
  kuni 03:00 da, 14 kunlik saqlash. Loglar: `logs/backup.log`. Qo'lda
  ishga tushirilib tekshirilgan (2026-09-06).
- **Batafsil**: `docs/deploy.md` — o'rnatish, yangilash, Nginx, backup/restore.
- **Hisob bloklash + sessiyani bekor qilish (2026-09-06)**: `User.isActive`
  va `User.sessionVersion` bor. `requireRole()` (`src/lib/auth.ts`) har
  sahifa yuklanishida bazadagi haqiqiy holatni tekshiradi — bloklangan
  yoki `sessionVersion` mos kelmagan foydalanuvchi JWT muddati
  (1 hafta) tugashini kutmasdan darhol chiqarib yuboriladi. Direktor
  o'z ustozini (`canManageTutor`), Ustoz o'z o'quvchisini
  (`canManageStudent`) `PATCH /api/tutors/[id]` /
  `PATCH /api/tutor/students/[id]` orqali bloklaydi/tiklaydi
  (`RosterTable.tsx`, `TutorRankingTable.tsx`). Tashkilot tarifi
  `EXPIRED` bo'lsa login `403` bilan rad etiladi
  (`OrganizationExpiredError`).
- **Login rate-limit IP fix (2026-09-06)**: `getClientIp()`
  (`src/lib/rateLimit.ts`) `X-Forwarded-For`ning oxirgi (Nginx qo'shgan)
  qiymatini oladi, birinchisini emas — birinchi qiymat mijoz tomonidan
  soxtalashtirilishi mumkin edi va 10-urinish cheklovini butunlay
  chetlab o'tar edi. Bu fix ⚠️ bilan Nginx konfiguratsiyasiga bog'liq:
  proxy yo'lida bittadan ortiq bo'lmasa ishlaydi (`docs/deploy.md`
  3-bo'limiga qara).
- ⚠️ **fail2ban `corepanel-login` jail — ilovaning rate-limit'iga bog'liq
  (2026-09-08)**: server darajasida `/etc/fail2ban/jail.local`da
  `corepanel-login` jail'i `POST /api/auth/login` 401'larini kuzatib
  turadi (endi testify'ning o'z `access_log`idan —
  `/var/log/nginx/testify_access.log`, avval umumiy `access.log`dan
  edi). Qiymatlari (`maxretry=50`, `findtime=5m`, `bantime=15m`) ataylab
  `src/lib/rateLimit.ts`dagi `LOGIN_IP_RATE_LIMIT` (40 urinish/15 daqiqa)
  dan YUQORI turadi: normal foydalanuvchi (masalan bitta NAT ortidagi
  30 o'quvchilik sinf) ilovaning o'z 429 javobiga uriladi (bu fail2ban
  regex'iga tushmaydi, faqat 401 sanaladi) va butun sayt bloklanmaydi;
  fail2ban faqat ilovani chetlab o'tgan/haddan tashqari hajmli trafikni
  tutadi. **MUHIM: bu ikkisi bir-biriga bog'liq — `rateLimit.ts`dagi
  `LOGIN_IP_RATE_LIMIT.maxAttempts` yoki `windowMs` o'zgarsa,
  `jail.local`dagi `corepanel-login`ning `maxretry`/`findtime`/`bantime`
  ham shunga qarab qayta ko'rilishi shart** (fail2ban chegarasi doim
  ilova chegarasidan yuqori qolishi kerak), aks holda butun sayt yana
  oddiy foydalanuvchilarni bloklay boshlaydi. Asosiy brute-force himoyasi
  bu emas — u hisob (email) bo'yicha cheklov (`LOGIN_ACCOUNT_RATE_LIMIT`,
  10/15 daqiqa, IP almashtirish bilan aylanib o'tilmaydi); fail2ban shunchaki
  ikkinchi, hajmli-hujumga qarshi qatlam.
- **Production test hisoblari (2026-09-06)**: tezkor test uchun 4 rolli
  hisob production DB'da (`testify_prod`) yaratildi/tiklandi — parol
  hammasida bir xil: **test1234**

  | Rol | Email |
  |---|---|
  | App Owner | owner@testify.dev |
  | Direktor | director@testify.dev |
  | Ustoz | tutor@testify.dev |
  | O'quvchi | student1@testify.dev |

  Tashkilot: "Test Avtomaktab" (id `test-org-1`), Guruh: "Test Guruh"
  (id `test-group-1`) — direktor/ustoz/o'quvchi shularga bog'langan.
  Qayta ishlatish/tiklash uchun: `npx tsx scripts/reset-test-accounts.ts`
  (idempotent — mavjud bo'lsa parolni test1234'ga qaytaradi va
  sessionVersion'ni oshiradi). Bu hisoblarni yaratgan
  `owner@testif.gt.tc` eski owner hisobiga tegilmagan, u ham hali bor.
- **Production'dagi test savollari (2026-09-06)**: dastlab 0 ta savol
  bor edi (`prisma/seed.ts` faqat lokal dev bazaga ishlaydi, production
  hech qachon to'liq seed qilinmagan). Tezkor test uchun 64 tadan
  **20 tasi** qo'lda ko'chirilgan (3 mavzu: "Yo'l belgilari" — 8 ta,
  "Svetofor va nazoratchi ishoralari" — 7 ta, "Ustunlik huquqi" — 4 ta),
  xuddi seed.ts dagi bilan bir xil deterministik ID sxemasi bilan
  (`seed-topic-<slug>`, `<topicId>-q<i>`) — shu sabab kelajakda to'liq
  `prisma/seed.ts` production'da ishga tushirilsa, bu 20 tasi
  qayta yozib almashtiriladi (upsert), dublikat bo'lmaydi. Qolgan
  44 tasini qo'shish uchun xuddi shu usulni takrorlash kifoya (vaqtinchalik
  skript ishlatilib, keyin o'chirilgan — saqlanmagan).
- ⚠️ **2026-09-06 kechqurun git divergensiya voqeasi**: production
  papkasi (shu joy) va boshqa bir sessiya/nusxa parallel ravishda bir
  xil narsa (isActive/sessionVersion/blocking) ustida ishlagan — boshqa
  nusxa GitHub'ga oldinroq push qilgan, bu papka esa pull qilmasdan
  turib alohida commit qilgan edi. `git merge` bilan birlashtirildi
  (conflict faqat `auth/login/route.ts` va `services/users.ts`da,
  qo'lda hal qilindi), keyin `npx prisma migrate deploy` +
  rebuild + `pm2 reload` bilan productionga qo'llanildi va
  tekshirildi. **Xulosa**: kelajakda katta o'zgarishdan oldin har doim
  avval `git fetch && git log HEAD..origin/main` bilan uzoq
  branch oldinda emasligini tekshir.
