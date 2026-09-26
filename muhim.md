# Muhim ma'lumotlar

Bu fayl suhbat o'chirilganda yo'qoladigan ma'lumotlarni saqlaydi.
Loyiha qoidalari — `CLAUDE.md`, holat — `docs/loyiha-holati.md`,
ruxsatlar — `docs/rollar.md`, ish ro'yxati — `docs/ishlar.md`.

## ⚠️ Xavfsizlik

- **Production test hisoblari** (`owner@testify.dev` va boshqalar) GitHub
  tarixida ochiq turgan parol bilan kiradi — 2026-09-11 da tekshirildi,
  ishlayapti. Repo public.
  **Qaror (2026-09-18): parollar hozircha o'z holicha qoladi** —
  almashtirilmaydi. Xavf saqlanib turibdi: repo'ni topgan har kim owner
  hisobiga kira oladi va rate-limit bunga to'sqinlik qilmaydi (parol
  to'g'ri). Fikr o'zgarsa:
  `RESET_TEST_PASSWORD="<yangi>" npx tsx scripts/reset-test-accounts.ts`
  (idempotent, eski sessiyalarni darhol tugatadi). Parolning o'zi hech
  qayerga yozilmaydi.
- Chek fayllari `storage/receipts/` da (git'ga tushmaydi).

## Ishlab chiqish muhiti (Windows)

- **Dev baza:** Neon (`.env` dagi `DATABASE_URL`). Production alohida — VPS'dagi
  PostgreSQL. Dev'da `prisma migrate dev`, production'da `prisma migrate deploy`.
- **Dev server porti: 3150.** 3100 band — u boshqa loyiha (`D:\fr5\hisob-sayt`),
  unga tegilmaydi.
- **`prisma generate` `EPERM` beradi**, agar dev server ishlab tursa (DLL
  qulflangan). Avval shu repo jarayonlarini to'xtatish kerak (`node.exe`,
  buyruq satrida `fr5\testify` bor), keyin generate.
- Fon vazifasini to'xtatish dev serverning bola jarayonlarini o'ldirmaydi —
  ularni qo'lda to'xtatish kerak.
- `.next/types` o'chirilsa `LayoutProps` topilmaydi → `npx next typegen`.
- Kompyuterda ~4 GB RAM: og'ir ishlar ketma-ket bajariladi, brauzer ochilmaydi.

## Qanday tekshiriladi

Brauzer o'rniga **HTTP tekshiruv skriptlari**: `tsx` bilan dev serverga so'rov
yuboriladi, natija Prisma orqali bazadan tekshiriladi, skript oxirida o'zi
yaratgan hamma narsani o'chiradi. Shu usulda tekshirilgan: to'lov oqimi (jonli
saytda), vazifa berish (51 ta tekshiruv), bildirishnomalar (38 ta).

**Doimiy skript (2026-09-21):** `scripts/tekshiruv-ui.ts` — 82 ta tekshiruv.

```
npm run dev -- -p 3150          # birinchi terminal
npx tsx scripts/tekshiruv-ui.ts # ikkinchi terminal
```

Nimani tekshiradi: har bir rolning sahifalari 200 qaytaradimi, kutilgan matn
bormi, dizayn tokenlari CSS'ga yetganmi, va **ruxsat chegaralari** (kim
qayerga kira olmaydi). Qabulxona hisobi seed'da yo'q — skript uni o'zi
yaratadi va o'chiradi; test ekrani urinish yaratadi, u ham o'chiriladi
(faqat shu ishga tushirishda yaratilganlari).

⚠️ **Papka o'chirilib qayta yaratilsa** (masalan yo'l ko'chirilganda) dev
server yangi yo'lni ko'rmay 404 berishi mumkin. Bunda serverni qayta ishga
tushirish kerak (`.next/dev` ni o'chirib).

Next.js eslatmalari:
- `loading.tsx` bor sahifada `redirect()` 307 emas, 200 javobi ichida keladi
  (`<meta refresh>` yoki RSC'dagi `NEXT_REDIRECT`) — skript shuni o'qishi kerak.
- HTML'da har bir matn ikki marta uchraydi (ko'rinadigan qism + RSC paketi),
  shuning uchun `>Matn<` ko'rinishida sanaladi.

## Qabul qilingan qarorlar (2026-09-13 … 17)

1. **Qabulxona (`RECEPTION`) — beshinchi rol.** Pul bilan ishlaydi (chek
   tasdiqlash + naqd), o'quvchi qo'shadi, bloklaydi, parol tiklaydi, guruhga
   ko'chiradi. Karta va narx sozlamalari, xodimlar — faqat direktorda.
2. **To'rtta kalit** direktor sozlamalarida — `docs/rollar.md`.
3. **Ustozdan ma'muriy amallar olinadi**, lekin faqat ommaviy import
   qilingandan keyin: aks holda 200 ta o'quvchi qo'lda kiritiladi.
4. **Xatolardan test:** "xato" = oxirgi javob noto'g'ri; 10 ta savol; tanlangan
   filtr bo'yicha; oddiy test mexanizmi orqali (alohida yo'l qilinmaydi — aks
   holda statistika ikkiga bo'linadi). Qidiruv kerak emas.
5. **Arxiv:** o'chirilgan kod uchun `arxiv/` papka YARATILMAYDI — git tarixi
   yetarli. Buning o'rniga `docs/arxiv.md`: nima edi, nega to'xtatildi, oxirgi
   ishlagan commit, qanday qaytariladi.
6. **Eski "avtomaktab → owner" to'lov oqimi** (~1 100 qator, 8 fayl)
   `ORGANIZATION_BILLING_UI_ENABLED = false` bayrog'i bilan uxlab yotibdi —
   o'chirilmaydi, bayroq bilan qoladi.
7. **Tashqi savollar bazasi** (autotestlar.uz, 1 220 savol) faqat egasidan
   **yozma ruxsat** bilan olinadi. Ruxsatda aniq bo'lishi kerak: qaysi
   ma'lumot, qayerda ishlatiladi (sinov yoki tijorat), muddati, manba
   ko'rsatish sharti. Olingan savollarga `source` belgisi qo'yiladi.
8. **Dizayn yo'nalishlari tasdiqlangan** — `docs/ishlar.md` 2-bo'limi.

9. **Savol rasmlari** `public/` da EMAS — `storage/question-images/` da va
   `/api/question-images/[key]` orqali, sessiya bilan beriladi. Sabab:
   savollar bazasi mahsulotning asosiy qiymati; ochiq papkada tursa
   butunlay ko'chirib olinardi. Tur fayl nomidan emas, baytlardan
   aniqlanadi; SVG qabul qilinmaydi.
10. **Import qoidalari:** bitta xato bo'lsa hech narsa yozilmaydi; takror
    savol o'tkazib yuboriladi (qayta yuborish xavfsiz); mavzu yo'q bo'lsa
    ochiladi va hisobotda aytiladi; bir urinishda 500 tagacha.
11. **Bilet** — alohida jadval emas, `Question.ticketNumber` va
    `ticketOrder`. Bilet mashq rejimida ishlaydi, savollar har safar bir
    xil tartibda.
12. **Agent tajribasi:** qabulxona roli fon agentiga berilgan edi, u
    ~40% da to'xtab qoldi (RAM yetmasligi). Ishi worktree'da saqlanib,
    qo'lda yakunlandi. Bu kompyuterda uzoq davom etadigan fon agentiga
    tayanmaslik kerak.

## Dizayn (2026-09-21)

UI to'liq qayta ishlandi — `docs/dizayn.md`. Asosiy qarorlar:

1. **Brend turkuaz** (`#0ea79a`), navy sidebar. Manba — foydalanuvchi bergan
   `Testify production frontend design specification` va maketlar. O'sha
   hujjat Downloads'dan o'chib ketgan, shuning uchun mazmuni `docs/dizayn.md`
   ga ko'chirildi.
2. **Obyekt sahifalari birlashtirildi**: `/guruh/[id]`, `/ustoz/[id]`,
   `/oquvchi/[id]` — rol papkasidan tashqarida, barcha rollar uchun bitta.
   Sabab: guruh sahifasi ikki nusxada edi va qabulxonaga uchinchisi kerak
   bo'lardi. Eski manzillar `redirect()` bilan ishlaydi.
3. **Maketdan uchta narsa OLIB TASHLANDI**, chunki orqasida ma'lumot yo'q:
   sana tanlagich, yulduzli reyting (100 pog'onani 5 ga siqadi), "Bugungi
   maqsad" bloki. O'rniga: amal tugmalari, "Faollik" ustuni, obuna holati.
4. **Qilinmagan**: faollik grafigi va "o'tgan oyga nisbatan" trend — ikkalasi
   ham yangi ma'lumot to'plashni talab qiladi (o'quvchi/guruh sonining tarixi
   saqlanmaydi).

## Egasining baholari

Loyiha egasi (Aslbek) qo'ygan baholar — `docs/loyiha-holati.md` da 👤
belgisi bilan. Ular kod bo'yicha taxmindan USTUN turadi.

- **2026-09-21 — Direktor hisobi: 70%** (tasdiqlangan). Ilgari hujjatda
  95% turardi, lekin u faqat panel ko'rinishini o'lchagan edi. 70% —
  rolning to'liq ishi bo'yicha. Kuzatilgan bo'shliqlar ro'yxati
  `docs/loyiha-holati.md` da.

## Ochiq savollar

- ⚠️ **Test paroli mos kelmaydi:** `CLAUDE.md` da `test1234` yozilgan, dev
  bazadagi hash esa `testify123` ga mos keladi. Qaysi biri to'g'ri —
  hujjatni tuzatish yoki `RESET_TEST_PASSWORD` bilan bazani yangilash kerak.
  Tekshiruv skripti hozir `testify123` bilan ishlaydi (`TEST_PASSWORD`
  muhit o'zgaruvchisi bilan almashtiriladi).
- **Deploy qachon?** 13 ta commit va 5 ta migratsiya production'da yo'q
  (`docs/loyiha-holati.md`). Parollar o'zgartirilmaydi — deploy faqat
  yangi funksiyalarni chiqaradi.
- **Savollar bazasi qaysi manbadan to'ldiriladi?** Import vositasi tayyor.
- Tarif (Plan) ishlatiladimi — modullar tarifga bog'lanadimi yoki keyinroq?
- Qabulxona uchun amallar jurnali qachon qilinadi (pul unda)?
