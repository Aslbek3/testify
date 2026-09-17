# Muhim ma'lumotlar

Bu fayl suhbat o'chirilganda yo'qoladigan ma'lumotlarni saqlaydi.
Loyiha qoidalari — `CLAUDE.md`, holat — `docs/loyiha-holati.md`,
ruxsatlar — `docs/rollar.md`, ish ro'yxati — `docs/ishlar.md`.

## ⚠️ Xavfsizlik

- **Production test hisoblari** (`owner@testify.dev` va boshqalar) hali ham
  GitHub tarixida ochiq turgan parol bilan kiradi — 2026-09-11 da tekshirildi,
  ishlayapti. Repo public. Almashtirish:
  `RESET_TEST_PASSWORD="<yangi>" npx tsx scripts/reset-test-accounts.ts`.
  Parolning o'zi hech qayerga yozilmaydi.
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

## Ochiq savollar

- Tayyor ikkita ish (vazifa, bildirishnoma) production'ga qachon chiqadi?
- Tarif (Plan) ishlatiladimi — modullar tarifga bog'lanadimi yoki keyinroq?
- Xatolarim: mavzu bo'yicha filtr qo'shilsinmi (tavsiya: ha)?
