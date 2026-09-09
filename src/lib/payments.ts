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
