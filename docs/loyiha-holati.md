# Testify — loyiha holati

Oxirgi yangilanish: 2026-09-21 · Tekshirilgan commit: `588da9e`

Bu fayl "nima tayyor, nima yo'q" degan savolga javob beradi. Foizlar —
"avtomaktabga sotsa bo'ladigan mahsulot" o'lchoviga nisbatan baho. Aniq
o'lchov emas, yo'nalish ko'rsatkichi.

Baho ikki manbadan keladi va ular **ajratib ko'rsatiladi**:
- 👤 — loyiha egasining (Aslbek) o'z bahosi, sanasi bilan;
- qolgani — kodni ko'rib chiqib qo'yilgan taxmin.

Kelishmovchilik bo'lsa **egasining bahosi ustun turadi**: u mahsulotni
avtomaktabga sotadi, ya'ni "tayyor" degani nimani anglatishini u biladi.

## Umumiy

| O'lchov | Holat |
|---|---|
| Kod (MVP funksiyalari) | ~92% |
| Kontent (savollar bazasi) | ~5% |
| 17 qismning o'rtachasi | **74%** |

⚠️ Ilgari bu yerda "~84%" yozilgan edi — u haqiqiy o'rtacha emas, qo'lda
qo'yilgan taxmin edi. Endi raqam jadvaldagi 17 ta foizdan hisoblanadi
(jami 1250 / 17 = 73.5 — yangi "Ma'lumotnoma" qismi 25% bilan qo'shildi,
shuning uchun o'rtacha pasaydi).

Eng katta to'siq endi kodda emas, **kontentda**: dev bazada 66 ta savol,
production'da 20 ta, raqobatchida (autotestlar.uz) 1 220 ta. Savollarni
kiritish vositalari (import, rasm yuklash, bilet) tayyor — yetishmayotgani
savollarning o'zi.

## Qismlar bo'yicha

| # | Qism | Tayyor | Yetishmaydi |
|---|---|---|---|
| 1 | Kirish va xavfsizlik | 90% | SMS/telefon orqali kirish |
| 2 | Direktor paneli | **70%** 👤 | pastga qara |
| 3 | Qabulxona (5-rol) | 90% | amallar jurnali, ommaviy import |
| 4 | O'quvchi to'lovi | 90% | Click/Payme orqali onlayn to'lov |
| 5 | Ustoz paneli | 95% | — |
| 6 | Vazifa berish | 90% | takroriy vazifa (har hafta avtomatik) |
| 7 | O'quvchi: test yechish | 95% | — |
| 8 | Xatolar ustida ishlash | 90% | aqlli takrorlash (spaced repetition) |
| 9 | Infratuzilma | 90% | monitoring, CI |
| 10 | Bildirishnomalar | 80% | Telegram; menyudagi son real vaqtda yangilanmaydi |
| 11 | UI va mobil | 95% | owner/questions ekranlari chuqurroq ishlanmagan |
| 12 | Owner paneli | 85% | mavzu tahriri, direktorni bloklash, arxivlash |
| 13 | Avtomaktab → platforma obunasi | 50% | UI yashirin (`ORGANIZATION_BILLING_UI_ENABLED = false`) |
| 14 | **Savollar bazasi (kontent)** | **5%** | production 20 ta, dev 66 ta savol; bilet yo'q |
| 15 | Avtomatik testlar | 30% | `scripts/tekshiruv-ui.ts` — 110 ta tekshiruv, ruxsat chegaralari bilan; qo'lda ishga tushiriladi, CI yo'q |
| 17 | Ma'lumotnoma (shpargalka, yo'l belgilari) | 25% | shakl tayyor, kontent yo'q: 283 ta belgidan 20 tasi, 8 ta shpargalkadan 2 tasi |
| 16 | Dars jadvali | 85% | davomat (kim keldi), darsni ko'chirish — hozir faqat bekor qilish |

## Direktor hisobi — 70% 👤

**Aslbekning bahosi, 2026-09-21 da tasdiqlangan.** Ilgari bu yerda 95%
turardi (kod bo'yicha taxmin), lekin u faqat PANEL ko'rinishini
o'lchagan. 70% — direktor rolining to'liq ishi bo'yicha baho.

Tayyor:
- Panel: ko'rsatkichlar, faollik grafigi (7/30/90 kun), "Bugungi ish"
- Uchta jurnal: guruhlar, ustozlar, o'quvchilar — taqqoslash chizig'i bilan
- Obyekt sahifalari: guruh, ustoz, o'quvchi (barcha rollar uchun umumiy)
- Ustoz va qabulxona xodimi yaratish, bloklash, parol tiklash
- Guruh yaratish, tahrirlash, o'chirish; o'quvchini guruhlar orasida ko'chirish
- To'lov sozlamalari, chek tasdiqlash, naqd to'lov, to'lovlar tarixi
- To'rtta ruxsat kaliti

Kodda kuzatilgan bo'shliqlar (bu — kuzatuv, egasining ro'yxati emas):
- Qabulxona **amallar jurnali** yo'q — pul qabulxonada, lekin "kim,
  qachon, nima qildi" yozilmaydi (`docs/ishlar.md` 4-bo'lim)
- O'quvchilarni **Excel/CSV dan ommaviy import** qilish yo'q — 200 ta
  o'quvchi qo'lda kiritiladi
- **"O'tgan oyga nisbatan" trend** yo'q: o'quvchi/guruh/ustoz sonining
  tarixi bazada saqlanmaydi, buning uchun yangi jadval kerak
- **Tarif (Plan)** faqat yorliq — hech narsani cheklamaydi
- **Guruhni arxivlash** yo'q: faqat o'chirish bor, u ham urinishi bor
  guruhda ishlamaydi
- Avtomaktab → platforma obunasi UI yashirin
  (`ORGANIZATION_BILLING_UI_ENABLED = false`)

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

**Yo'q — hammasi chiqarilgan.** 2026-09-26 da `edc211e` → `238a62e`
(11 ta commit) production'ga qo'llandi: dizayn poydevori, uchta jurnal,
birlashgan obyekt sahifalari, "Bugungi ish" paneli, faollik grafigi,
ustozning bo'limlari, dars jadvali. `lessons` migratsiyasi qo'llandi,
kutayotgan migratsiya qolmadi (`migrate status` → up to date).
Tafsiloti `CLAUDE.md` dagi deploy tarixida.

⚠️ Production test hisoblarining paroli GitHub tarixida ochiq turibdi.
`muhim.md` dagi qaror (2026-09-18): hozircha o'z holicha qoladi.

## Keyingi qadamlar

1. **Savollar bazasini to'ldirish** — import tayyor, manba kerak.
   Eng katta to'siq shu: production'da 20 ta savol bor.
2. `docs/gidoyalar.md` dagi yig'ilgan g'oyalarni saralash.
3. Qabulxona uchun amallar jurnali (pul unda bo'lgani uchun).
4. O'quvchilarni Excel'dan ommaviy import qilish.
