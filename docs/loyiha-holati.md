# Testify — loyiha holati

Oxirgi yangilanish: 2026-09-21 · Tekshirilgan commit: `5ff4a71`

Bu fayl "nima tayyor, nima yo'q" degan savolga javob beradi. Foizlar —
kodni ko'rib chiqib qo'yilgan baho, "avtomaktabga sotsa bo'ladigan
mahsulot" o'lchoviga nisbatan. Aniq o'lchov emas, yo'nalish ko'rsatkichi.

## Umumiy

| O'lchov | Holat |
|---|---|
| Kod (MVP funksiyalari) | ~92% |
| Kontent (savollar bazasi) | ~5% |
| 15 qismning o'rtachasi | **~84%** |

Eng katta to'siq endi kodda emas, **kontentda**: dev bazada 66 ta savol,
production'da 20 ta, raqobatchida (autotestlar.uz) 1 220 ta. Savollarni
kiritish vositalari (import, rasm yuklash, bilet) tayyor — yetishmayotgani
savollarning o'zi.

## Qismlar bo'yicha

| # | Qism | Tayyor | Yetishmaydi |
|---|---|---|---|
| 1 | Kirish va xavfsizlik | 90% | SMS/telefon orqali kirish |
| 2 | Direktor paneli | 95% | — |
| 3 | Qabulxona (5-rol) | 90% | amallar jurnali, ommaviy import |
| 4 | O'quvchi to'lovi | 90% | Click/Payme orqali onlayn to'lov |
| 5 | Ustoz paneli | 95% | — |
| 6 | Vazifa berish | 90% | takroriy vazifa (har hafta avtomatik) |
| 7 | O'quvchi: test yechish | 95% | — |
| 8 | Xatolar ustida ishlash | 90% | aqlli takrorlash (spaced repetition) |
| 9 | Infratuzilma | 85% | monitoring, CI |
| 10 | Bildirishnomalar | 80% | Telegram; menyudagi son real vaqtda yangilanmaydi |
| 11 | UI va mobil | 95% | owner/questions ekranlari chuqurroq ishlanmagan |
| 12 | Owner paneli | 85% | mavzu tahriri, direktorni bloklash, arxivlash |
| 13 | Avtomaktab → platforma obunasi | 50% | UI yashirin (`ORGANIZATION_BILLING_UI_ENABLED = false`) |
| 14 | **Savollar bazasi (kontent)** | **5%** | production 20 ta, dev 66 ta savol; bilet yo'q |
| 15 | Avtomatik testlar | 30% | `scripts/tekshiruv-ui.ts` — 64 ta tekshiruv, ruxsat chegaralari bilan; qo'lda ishga tushiriladi, CI yo'q |

## Rollar

`docs/rollar.md` — to'liq matritsa. Qisqacha: **ustoz o'qitadi ·
qabulxona mijoz bilan ishlaydi · direktor boshqaradi · owner platformani
boshqaradi.** To'rtta kalit direktor sozlamalarida: qabulxona pul bilan
ishlaydimi, natijalarni ko'radimi; ustoz o'quvchi qo'shadimi, parol
tiklaydimi.

## Dizayn (2026-09-21 da to'liq qayta ishlandi)

Batafsil — `docs/dizayn.md`. Qisqacha nima o'zgardi:

- **Tokenlar**: brend ko'kdan turkuazga (`#0ea79a`), navy sidebar,
  3 pog'onali soya, radius shkalasi. Ilgari butun ilovada bitta ham soya
  yo'q edi va hamma element 6px radiusli quticha ko'rinardi.
- **Shriftlar**: Space Grotesk + DM Sans. Ilgari butun ilova 14px da
  yozilgan edi (`text-sm` 315 marta, `text-base` 11 marta).
- **Ikonkalar**: 40 ta. Ilgari 114 faylning 4 tasida SVG bor edi.
- **Uchta jurnal** (guruhlar, ustozlar, o'quvchilar) — taqqoslash
  chizig'i bilan.
- **Obyekt sahifalari birlashtirildi**: `/guruh/[id]`, `/ustoz/[id]`,
  `/oquvchi/[id]` — barcha rollar uchun bitta sahifa. Qabulxona guruh va
  o'quvchi sahifalarini qo'shimcha kodsiz oldi.
- **"Bugungi ish" paneli** — direktor, qabulxona va ustoz uchun.
- **Test ekrani** to'q (navy) o'rganish qobig'iga o'tkazildi.
- ALL CAPS yorliqlar butunlay olib tashlandi.

## Arxitektura qoidalari — bajarilgan

- `prisma` klienti faqat `services/` va `lib/prisma.ts` da.
- Har bir API route ruxsatni tekshiradi; istisnolar (`attempts/[id]`,
  `profile/*`, `notifications`, `question-images/[key]`) izohda asoslangan.
- So'rovdan keladigan har bir ID tashkilotga tegishliligi tekshiriladi;
  "topilmadi" va "ruxsat yo'q" bir xil javob qaytaradi.
- TypeScript va ESLint xatosiz.

## Chiqarilmagan ish

`953119a` dan keyin **13 ta commit** production'ga chiqarilmagan:
vazifa berish, bildirishnomalar, xatolardan test, o'quvchi dizayni,
ustoz uchun guruh sahifasi, qabulxona roli, ustoz profili, rasm yuklash,
savollar importi, bilet rejimi.

Production'da **5 ta migratsiya** kutyapti: `assignments`,
`notifications`, `attempt_source`, `reception_role`, `question_tickets`.

⚠️ Deploydan oldin production test hisoblarining paroli almashtirilishi
kerak — u GitHub tarixida ochiq turibdi (`muhim.md`).

## Keyingi qadamlar

1. **Deploy** — 13 ta ish bir joyda to'planib qoldi, jonli saytda
   sinalmagan.
2. **Savollar bazasini to'ldirish** — import tayyor, manba kerak.
3. Qabulxona uchun amallar jurnali (pul unda bo'lgani uchun).
4. O'quvchilarni Excel'dan ommaviy import qilish.
5. Avtomatik testlar (birinchisi — ruxsatlar matritsasi).
