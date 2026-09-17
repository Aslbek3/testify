# Qilinadigan ishlar

Oxirgi yangilanish: 2026-09-17. Tartib — ustuvorlik bo'yicha.
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

## 2. Dizayn (tasdiqlangan yo'nalishlar)

- ✅ **b** — o'quvchi uchun pastki panel (telefonda): Umumiy · Mashq · Imtihon · Vazifalar · Xatolarim
- ✅ **c** — test ekranida diqqat rejimi: menyu va sarlavha yashiriladi
- ✅ **f** — bo'sh holatlar: har birida keyingi qadam tugmasi
- ✅ **e** — rang intizomi: qizil faqat haqiqiy muammo uchun
- ✅ **d** — o'quvchi sahifasida "keyingi qadam" tavsiyasi
- ⬜ **a** — panellar "kim orqada qolyapti" ga javob bersin

## 3. Guruh oynasi va ustoz profili

- ⬜ Guruh sahifasi ustoz uchun ham (direktorda bor): 4 ko'rsatkich,
  "diqqat talab qiladi" bloki, mavzular tahlili, vazifalar, o'quvchilar
- ⬜ `/tutor` — guruhlar ro'yxatiga aylanadi (hozir ochiladigan ro'yxat)
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

## 5. Kontent (eng katta to'siq)

- ✅ Savolga **rasm yuklash**
- ✅ Savollarni ommaviy import qilish (JSON, owner panelida)
- ⬜ Savollar bazasini to'ldirish — production'da 20 ta, raqobatchida 1 220 ta.
  Tashqi manbadan olish faqat **yozma ruxsat** bilan, savolda `source` belgisi
  bilan (ruxsat bekor qilinsa, bitta buyruq bilan olib tashlash uchun)
- ⬜ Bilet rejimi (10 savollik to'plamlar)

## 6. Qolganlar

- ⬜ Avtomatik testlar (hozir yo'q; birinchisi — ruxsatlar matritsasi)
- ⬜ Monitoring: server yiqilsa xabar
- ⬜ Owner: mavzuni qayta nomlash/o'chirish, direktorni bloklash, tashkilotni arxivlash
- ⬜ Tarifni (Plan) ishlatish — hozir faqat yorliq
- ⬜ `docs/arxiv.md`: o'chirilgan yoki uxlayotgan funksiyalar ro'yxati
- ⬜ `CLAUDE.md` dagi eskirgan "Rollar bo'yicha holat" bo'limi (commit qilinmagan)
  o'rniga `docs/loyiha-holati.md` ga havola
- ⬜ Onlayn to'lov (Click/Payme)
- ⬜ Telegram bildirishnomalari
- ⬜ Spaced repetition (aqlli takrorlash)
