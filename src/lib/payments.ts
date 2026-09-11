/**
 * To'lov domenining SOF konstantalari — Prisma'ga bog'liq emas.
 *
 * Nega alohida fayl: bu qiymatlar ham serverda (tekshiruv), ham client
 * komponentlarda (`maxLength`, muddat tanlash ro'yxati) kerak.
 * `services/payments.ts` esa `@/lib/prisma` ni import qiladi — client
 * komponent undan bitta konstanta olsa ham, butun Prisma brauzer
 * bundle'iga tortilib, build buziladi. Shuning uchun umumiy qiymatlar
 * shu yerda turadi, service ularni qayta eksport qiladi.
 */

/**
 * Tanlash mumkin bo'lgan muddatlar.
 *
 * Mijozlar odatda oyma-oy yoki bir yo'la yarim yilga to'laydi — ro'yxat
 * shu ikkitasi atrofida. Ixtiyoriy son qabul qilinmaydi: "0 oy" yoki
 * "1000 oy" ma'nosiz, va cheklovsiz qiymat obunani cheksiz uzaytirish
 * yo'liga aylanardi.
 */
export const ALLOWED_MONTHS = [1, 3, 6, 12] as const;

/** So'mda. Yuqori chegara — tasodifan ortiqcha nol qo'yishdan himoya. */
export const MIN_AMOUNT = 1000;
export const MAX_AMOUNT = 1_000_000_000;

/**
 * Matn maydonlarining (izoh, to'lov raqami, rad etish sababi) eng ko'p
 * uzunligi. Haqiqiy tekshiruv doim serverda — client'dagi `maxLength`
 * shunchaki foydalanuvchi 300 belgi yozib, keyin xatoga urilib
 * qolmasligi uchun.
 */
export const MAX_TEXT_LENGTH = 200;

// ---- O'quvchi → avtomaktab to'lovi ----

/** O'quvchi tanlay oladigan muddatlar (oy). */
export const STUDENT_PAYMENT_MONTHS = [1, 6] as const;
export type StudentPaymentMonths = (typeof STUDENT_PAYMENT_MONTHS)[number];

export function isStudentPaymentMonths(value: unknown): value is StudentPaymentMonths {
  return STUDENT_PAYMENT_MONTHS.includes(value as StudentPaymentMonths);
}

/**
 * Chek hajmi chegarasi. Telefon skrinshoti odatda 0.3–2 MB, bank PDF
 * kvitansiyasi 100 KB atrofida — 5 MB zaxira bilan yetadi. Nginx
 * `client_max_body_size` (docs/nginx.conf.example — 10m) bundan katta
 * turishi shart, aks holda Nginx so'rovni ilovaga yetkazmay 413 qaytaradi.
 */
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

/** `<input type="file" accept>` uchun. Haqiqiy tekshiruv serverda — fayl baytlaridan. */
export const RECEIPT_ACCEPT = "image/jpeg,image/png,application/pdf";

/** Sinov muddati chegaralari (kun). */
export const MIN_TRIAL_DAYS = 0;
export const MAX_TRIAL_DAYS = 60;

/** O'quvchi to'lovi narxi chegaralari (so'm). */
export const MIN_STUDENT_PRICE = 1000;
export const MAX_STUDENT_PRICE = 100_000_000;

/**
 * Avtomaktab → owner to'lovi ekranlari (direktor paneli "Obuna"
 * kartochkasi, owner paneli "To'lovlar" bo'limlari).
 *
 * Hozircha O'CHIQ: avtomaktablar bilan tarif hali kelishilmagan
 * (2026-09-11). Backend (`services/payments.ts`, `Payment` jadvali,
 * `/api/payments`) va obuna muddati mantig'i joyida — tarif kelishilgach
 * shu qiymatni `true` qilish kifoya. Ekranlar yashirilmasa, direktor
 * "owner'ga to'lov yuborish" tugmasini ko'rib, o'quvchi to'lovi bilan
 * adashtirardi.
 */
export const ORGANIZATION_BILLING_UI_ENABLED = false;
