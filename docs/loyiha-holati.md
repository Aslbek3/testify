# Testify — loyiha holati

Oxirgi yangilanish: 2026-09-17 · Tekshirilgan commit: `c1958a5`

Bu fayl "nima tayyor, nima yo'q" degan savolga javob beradi. Foizlar — kodni
ko'rib chiqib qo'yilgan baho, "avtomaktabga sotsa bo'ladigan mahsulot"
o'lchoviga nisbatan. Aniq o'lchov emas, yo'nalish ko'rsatkichi.

## Umumiy

| O'lchov | Holat |
|---|---|
| Kod (MVP funksiyalari) | ~85% |
| Kontent (savollar bazasi) | ~5% |
| 13 qismning o'rtachasi | **~70%** |

Eng katta to'siq — kod emas, **kontent**: production'da 20 ta savol bor,
raqobatchida (autotestlar.uz) 1 220 ta.

## Qismlar bo'yicha

| # | Qism | Tayyor | Yetishmaydi |
|---|---|---|---|
| 1 | Kirish va xavfsizlik | 90% | SMS/telefon orqali kirish |
| 2 | Direktor paneli | 90% | — |
| 3 | O'quvchi to'lovi | 90% | Click/Payme orqali onlayn to'lov |
| 4 | Ustoz paneli | 90% | — |
| 5 | Vazifa berish | 90% | takroriy vazifa (har hafta avtomatik) |
| 6 | O'quvchi: test yechish | 85% | bilet rejimi; mavzu bo'yicha mashq ekranda yo'q (API bor) |
| 7 | Infratuzilma | 85% | server yiqilsa xabar beruvchi monitoring, CI |
| 8 | Bildirishnomalar | 80% | Telegram; menyudagi son real vaqtda yangilanmaydi |
| 9 | UI va mobil | 80% | — |
| 10 | Owner paneli | 65% | **savolga rasm yuklash**, **ommaviy import**, mavzu tahriri, direktorni bloklash, arxivlash |
| 11 | Avtomaktab → platforma obunasi | 50% | UI yashirin (`ORGANIZATION_BILLING_UI_ENABLED = false`), eski kodi turibdi |
| 12 | **Savollar bazasi (kontent)** | **5%** | production 20 ta, seed 64 ta savol |
| 13 | Avtomatik testlar | 5% | unit va integratsiya testlari (hozir faqat qo'lda tekshiruv) |

## Arxitektura qoidalari — bajarilgan

- `prisma` klienti faqat `services/` va `lib/prisma.ts` da.
- Har bir API route ruxsatni tekshiradi. To'rtta ataylab qilingan istisno
  (`attempts/[id]`, `attempts/[id]/finish`, `profile/*`, `notifications`) —
  ularda tekshiruv service ichida yoki `userId` faqat sessiyadan olinadi,
  sababi fayl boshidagi izohda.
- So'rovdan keladigan har bir `groupId` / `tutorId` / `studentId` shu
  tashkilotga tegishliligi tekshiriladi; "topilmadi" va "ruxsat yo'q" bir xil
  404 qaytaradi.
- TypeScript va ESLint xatosiz.

## Keyingi qadamlar (ustuvorlik bo'yicha)

1. **Xavfsizlik:** production test hisoblari GitHub tarixida ochiq turgan
   parol bilan ishlayapti (owner hisobi ham). `RESET_TEST_PASSWORD` bilan
   almashtirish kerak.
2. **Savolga rasm yuklash** — kontentni to'ldirishni ochib beradigan qadam.
3. **Savollar bazasini to'ldirish** (ruxsat olinsa — tashqi manbadan import,
   `source` belgisi bilan, keyin butunlay almashtira olish uchun).
4. **Bilet rejimi.**
5. Owner'dagi qolgan bo'shliqlar: mavzu tahriri, direktorni bloklash, arxivlash.
6. Avtomatik testlar.

## Chiqarilmagan ish

`03baf44` (vazifa berish) va `c1958a5` (bildirishnomalar) lokal commit
qilingan, **GitHub'ga push qilinmagan va production'ga chiqarilmagan**.
Production'da ikkita migratsiya kutyapti: `20260913164233_assignments`,
`20260913171140_notifications`.
