# Qilinadigan ishlar

Oxirgi yangilanish: 2026-09-21. Tartib — ustuvorlik bo'yicha.
Holat: ⬜ boshlanmagan · 🔵 jarayonda · ✅ tayyor

## 0. Chiqarilmagan (birinchi navbatda)

- ⬜ **Deploy:** `03baf44` (vazifa berish) va `c1958a5` (bildirishnomalar)
  lokal commit qilingan, GitHub'ga push qilinmagan, production'da yo'q.
  Serverda ikkita migratsiya kutyapti: `..._assignments`, `..._notifications`.
- ⬜ **Xavfsizlik:** production test hisoblari (owner ham) GitHub tarixida
  ochiq turgan parol bilan ishlayapti. `RESET_TEST_PASSWORD` bilan
  almashtirish (`scripts/reset-test-accounts.ts`).

## 1. Xatolarim — xatolardan test ✅ (bajarildi)

- ✅ `Attempt.source` maydoni (mashq · maraton · imtihon · vazifa · xatolar) —
  faqat yorliq uchun; qoidalarni avvalgidek `mode` boshqaradi
- ✅ Manba filtri, bir nechtasini birga tanlash
- ✅ Mavzu bo'yicha filtr
- ✅ Uchinchi ko'rsatkich: Hali xato · Tuzatilgan · Jami xato
- ✅ "Xatolardan test": 10 ta savol, tanlangan filtr bo'yicha, oddiy test ekranida
- ✅ Yuqoridagi "Test boshlash" tugmasi shu testga ulanadi (hozir mashqqa boradi)
- ✅ Xato qolmagan holat ekrani
- Qidiruv: **kerak emas** (qaror qabul qilingan)

## 2. Dizayn ✅ (2026-09-21 da to'liq qayta ishlandi)

Batafsil — `docs/dizayn.md`.

- ✅ **b** — o'quvchi uchun pastki panel (telefonda), endi ikonkalar bilan
- ✅ **c** — test ekranida diqqat rejimi; endi to'q (navy) qobiq
- ✅ **f** — bo'sh holatlar: `EmptyState` komponenti, har birida keyingi qadam
- ✅ **e** — rang intizomi: qizil faqat haqiqiy muammo uchun
- ✅ **d** — o'quvchi sahifasida "keyingi qadam" tavsiyasi
- ✅ **a** — panellar "kim orqada qolyapti" ga javob beradi: uchta jurnal
  taqqoslash chizig'i bilan, "Bugungi ish" paneli, obyekt sahifalari
- ✅ Yangi dizayn tizimi: turkuaz brend, Space Grotesk + DM Sans, 40 ta
  ikonka, soya va radius shkalasi
- ✅ `/guruh/[id]`, `/ustoz/[id]`, `/oquvchi/[id]` — obyekt sahifalari
  barcha rollar uchun birlashtirildi
- ✅ `@media print` — jurnal qog'ozda ham o'qiladi

Qolgani (kichik):
- ⬜ `/owner/questions` va savol qo'shish modali chuqurroq ishlanmagan
- ⬜ Faollik grafigi (kunlik agregatsiya) — qaror kutilmoqda
- ⬜ "O'tgan oyga nisbatan" trend — tarixiy ma'lumot saqlanmaydi

## 3. Guruh oynasi va ustoz profili ✅

- ✅ Guruh sahifasi ustoz uchun ham (direktorda bor): 4 ko'rsatkich,
  "diqqat talab qiladi" bloki, mavzular tahlili, vazifalar, o'quvchilar
- ✅ `/tutor` — guruhlar ro'yxatiga aylanadi (hozir ochiladigan ro'yxat)
- ✅ Ustoz profili direktor uchun (`/director/ustoz/[id]`): guruhlari,
  umumiy statistika, bergan vazifalari va bajarilishi, direktor amallari
- ⚠️ Ustozni faqat o'quvchilarining o'rtacha bali bilan baholamaslik —
  faollik ko'rsatkichi ham yonida tursin

## 4. Qabulxona roli (`docs/rollar.md`) — 1-bosqich ✅

- ✅ Rol, kirish, menyu, sahifa himoyasi
- ✅ `permissions.ts` qayta ko'rilishi; `canManageStudentPayments` ikkiga bo'linadi
- ✅ O'quvchi yaratishning ikki nusxasi bitta `/api/students` ga birlashtiriladi
- ✅ Qabulxona paneli: Umumiy (muddati tugayotganlar, kutayotgan cheklar,
  bugungi to'lovlar) · O'quvchilar · To'lovlar
- ✅ Direktorda "Qabulxona xodimi qo'shish"
- ✅ 4 ta kalit direktor sozlamalarida
- ⬜ Amallar jurnali (kim, qachon, nima qildi) + direktorda ko'rish sahifasi
- 🔵 Ruxsatlar tekshiruvi: 29 ta holat HTTP skripti bilan o'tkazildi;
  doimiy (avtomatik ishlaydigan) test to'plami hali yo'q
- ⬜ Ommaviy import (Excel/CSV dan o'quvchilar)
- ⬜ Ustozdan ma'muriy amallarni olish — **importdan keyin**

## 5. Kontent (vositalar tayyor, savollar kerak)

- ✅ Savolga **rasm yuklash**
- ✅ Savollarni ommaviy import qilish (JSON, owner panelida)
- ⬜ **Savollar bazasini to'ldirish** — yagona qolgan to'siq. Vositalar
  tayyor (import, rasm, bilet), manba kerak:
  1. autotestlar.uz egasidan yozma ruxsat, keyin ularning ro'yxatini
     import formatiga o'tkazish
  2. yoki o'zingizdagi tayyor ro'yxat (Excel/Word/PDF) — JSON'ga o'tkaziladi
  3. yoki rasmiy manba
  ⚠️ Savollar o'ylab topilmaydi: YHQ savoli huquqiy hujjatga asoslanadi,
  to'qilgan javob o'quvchini imtihonda yiqitadi
- ✅ Bilet rejimi — savolda ticketNumber/ticketOrder, o'quvchida "Biletlar" bo'limi

## 6. Qolganlar

- 🔵 Avtomatik testlar: `scripts/tekshiruv-ui.ts` — 64 ta tekshiruv, jumladan
  ruxsat chegaralari (kim qayerga kira olmaydi). Dev server ishlab turishini
  talab qiladi va qo'lda ishga tushiriladi; CI hali yo'q
- ⬜ Monitoring: server yiqilsa xabar
- ⬜ Owner: mavzuni qayta nomlash/o'chirish, direktorni bloklash, tashkilotni arxivlash
- ⬜ Tarifni (Plan) ishlatish — hozir faqat yorliq
- ⬜ `docs/arxiv.md`: o'chirilgan yoki uxlayotgan funksiyalar ro'yxati
- ⬜ `CLAUDE.md` dagi eskirgan "Rollar bo'yicha holat" bo'limi o'rniga
  `docs/loyiha-holati.md` ga havola
- ⚠️ `CLAUDE.md` dagi test paroli (`test1234`) dev bazadagi haqiqiy parolga
  (`testify123`) mos kelmaydi — biri yangilanishi kerak
- ⬜ Onlayn to'lov (Click/Payme)
- ⬜ Telegram bildirishnomalari
- ⬜ Spaced repetition (aqlli takrorlash)
