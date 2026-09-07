/**
 * Parol uzunligi cheklovlarining yagona joyi (xabarlar 6 ta route'da
 * takrorlanmasligi uchun).
 *
 * Yuqori chegara 72 — bcrypt parolning faqat dastlabki 72 baytini hisobga
 * oladi va qolganini jimgina tashlab yuboradi. Cheklovsiz uzun parol
 * kiritgan foydalanuvchi parolim kuchli deb o'ylab qolar edi, aslida esa
 * uning faqat boshi ishlatilar edi.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

/** Qoida buzilgan bo'lsa xato xabarini, hammasi joyida bo'lsa null qaytaradi. */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Parol kamida ${PASSWORD_MIN_LENGTH} belgidan iborat bo'lishi kerak`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Parol ${PASSWORD_MAX_LENGTH} belgidan oshmasligi kerak`;
  }
  return null;
}
