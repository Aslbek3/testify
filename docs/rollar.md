# Rollar va ruxsatlar

Oxirgi yangilanish: 2026-09-17

Bu hujjat — ruxsatlarning **yagona manbasi**. Kod shu jadvalga qarab yoziladi,
aksincha emas. `src/lib/permissions.ts` shu hujjatning kodga aylantirilgan
ko'rinishi bo'lishi kerak.

## Rollar

| Rol | Kim | Doirasi |
|---|---|---|
| **Owner** | Platforma egasi | Butun tizim |
| **Direktor** | Avtomaktab rahbari | O'z tashkiloti |
| **Qabulxona** (`RECEPTION`) | Qabulxona xodimi | O'z tashkiloti, ma'muriy ishlar |
| **Ustoz** | O'qituvchi | O'z guruhlari, faqat o'quv ishi |
| **O'quvchi** | Mijoz | O'zi |

Bir jumlada: **ustoz o'qitadi · qabulxona mijoz bilan ishlaydi · direktor
boshqaradi.**

Qabulxona — yordamchi, direktorning o'rinbosari emas: **direktordan hech
qanday huquq olinmaydi.** Qabulxonasi yo'q avtomaktabda hamma ish avvalgidek
direktorda qolaveradi.

## To'liq matritsa

"Sozlanadimi?" ustuni: ❌ — kodda qat'iy; 🔧 — direktor sozlamalaridagi kalit
bilan o'zgartiriladi.

| Amal | Owner | Direktor | Qabulxona | Ustoz | O'quvchi | Sozlanadimi? |
|---|---|---|---|---|---|---|
| **Platforma** |||||||
| Tashkilot yaratish, tarif, holat | ✅ | — | — | — | — | ❌ |
| Direktor yaratish | ✅ | — | — | — | — | ❌ |
| Savollar bazasi (mavzu, savol) | ✅ | — | — | — | — | ❌ |
| **Xodimlar** |||||||
| Ustoz yaratish | — | ✅ | — | — | — | ❌ |
| Ustozni bloklash, paroli | — | ✅ | — | — | — | ❌ |
| Qabulxona xodimini yaratish, bloklash | — | ✅ | — | — | — | ❌ |
| **Guruhlar** |||||||
| Guruh yaratish, tahrirlash, o'chirish | — | ✅ | — | — | — | ❌ |
| Guruhlarni ko'rish | — | ✅ | ✅ | o'ziniki | — | ❌ |
| **O'quvchilar** |||||||
| O'quvchi yaratish | — | ✅ | ✅ | — | — | 🔧 ustozga berish mumkin |
| Guruhga ko'chirish | — | ✅ | ✅ | — | — | ❌ (xavfsizlik, pastga qara) |
| Bloklash / tiklash | — | ✅ | ✅ | — | — | 🔧 ustozga berish mumkin |
| Parolini tiklash | — | ✅ | ✅ | — | — | 🔧 ustozga berish mumkin |
| Ro'yxatini ko'rish | — | ✅ | ✅ | o'z guruhi | — | ❌ |
| Progress va natijalarini ko'rish | — | ✅ | ✅ | ✅ | o'ziniki | 🔧 qabulxonadan olish mumkin |
| **Pul** |||||||
| To'lov sozlamalari: karta, narx, sinov kunlari | — | ✅ | — | — | — | ❌ |
| Chekni tasdiqlash / rad etish | — | ✅ | ✅ | — | — | 🔧 qabulxonadan olish mumkin |
| Naqd to'lovni qayd etish | — | ✅ | ✅ | — | — | 🔧 yuqoridagi kalit bilan birga |
| To'lovlar tarixini ko'rish | — | ✅ | ✅ | — | o'ziniki | ❌ |
| Chek rasmini ochish | — | ✅ | ✅ | — | o'ziniki | ❌ |
| **O'quv** |||||||
| Vazifa berish, o'chirish | — | — | — | ✅ | — | ❌ |
| Guruh tahlili, zaif mavzular | — | ✅ | ko'rish | ✅ | — | ❌ |
| Test ishlash | — | — | — | — | ✅ | ❌ |
| **Umumiy** |||||||
| O'z profili, paroli, bildirishnomalari | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

## Kalitlar (direktor sozlamalarida)

Bor-yo'g'i to'rtta. Har biri tashkilot darajasida saqlanadi, o'zgarishi
amallar jurnaliga yoziladi va darhol kuchga kiradi.

| Kalit | Standart | Ma'nosi |
|---|---|---|
| Qabulxona pul bilan ishlaydi | **yoqilgan** | Chekni tasdiqlash/rad etish va naqd to'lovni qayd etish |
| Qabulxona natijalarni ko'radi | **yoqilgan** | O'quvchining progressi va urinishlari (faqat ko'rish) |
| Ustoz o'quvchi qo'shadi va bloklaydi | **o'chiq** | Qabulxonasi yo'q kichik avtomaktab uchun |
| Ustoz parolni tiklay oladi | **o'chiq** | Xuddi shu holat uchun |

**Beshinchi kalit qo'shish sharti:** real mijozdan kelgan real talab.
"Kelajakda kerak bo'lar" yetarli sabab emas — har bir kalit test matritsasini
ikki barobar kattalashtiradi.

## O'zgarmas qoidalar va sabablari

1. **Karta raqami va narxlar — faqat direktor.** Kartani o'zgartira oladigan
   odam butun avtomaktabning pul oqimini o'ziga burib yubora oladi.
2. **Xodim yaratish va bloklash — faqat direktor.** Aks holda xodim o'ziga
   teng huquqli hisob ochib qo'ya oladi.
3. **O'quvchini guruhga ko'chirish — ustozga hech qachon berilmaydi.** Bu
   allaqachon tuzatilgan xavfsizlik teshigi: ustoz begona o'quvchini o'z
   guruhiga tortib olib, "o'z o'quvchisi" sifatida parolini tiklab, hisobiga
   to'liq kirib olishi mumkin edi. Sabab `permissions.ts` dagi
   `canAssignStudentToGroup` izohida ham yozilgan.
4. **Savollar bazasi va tashkilotlar — faqat owner.**
5. **Test urinishi — faqat o'quvchining o'zi.** Boshqa hech kim uning nomidan
   javob bera olmaydi.

## Tarif (Plan) bilan bog'liqligi

Ikki boshqa tushuncha:

- **Tarif** (Start / Standart / Pro) — *qaysi modullar ochiq*. Owner qarori,
  tijorat masalasi.
- **Kalitlar** — *ochiq modulni kim ishlatadi*. Direktor qarori, ichki ish
  taqsimoti.

Tarifda to'lov moduli bo'lmasa, "qabulxona pul bilan ishlaydi" kaliti umuman
ko'rinmaydi.

⚠️ Hozir `Plan` faqat yorliq — hech qanday imkoniyatni cheklamaydi. Uni
ishlatish alohida qaror sifatida kutib turibdi.

## Kodga ta'siri (qabulxona qo'shilganda)

1. `canManageStudentPayments` **ikkiga bo'linadi**: sozlamalar (direktor) va
   ko'rib chiqish (direktor + qabulxona, kalit bilan).
2. O'quvchi yaratish hozir **ikki joyda** (`/api/director/students` va
   `/api/tutor/students`) — bitta `/api/students` ga birlashtiriladi, ruxsatni
   `permissions.ts` hal qiladi.
3. Kalitlar sessiya tekshiruvida tashkilot ma'lumoti bilan birga o'qiladi
   (`getVerifiedSessionUser` allaqachon tashkilotni oladi) — ruxsat
   funksiyalari sof va sinxron qoladi.
4. **Amallar jurnali** (kim, qachon, nima qildi) — pul va hisoblarga tegishli
   amallar uchun majburiy.
5. **Ruxsatlar test to'plami** shu hujjat asosida yoziladi: 5 rol × har bir
   amal. Qo'lda tekshirib bo'lmaydi.
