/**
 * Savol rasmi bilan bog'liq qiymatlar — KLIENT ham ishlatadi (forma:
 * hajm chegarasi, `accept`), shuning uchun bu yerda `fs` yo'q. Diskka
 * yozish `lib/questionImageStorage.ts` da, faqat serverda.
 */

/** 3 MB — YHQ chizmasi uchun yetarli, sekin internetda ham ochiladi. */
export const MAX_QUESTION_IMAGE_BYTES = 3 * 1024 * 1024;

/**
 * Qabul qilinadigan turlar.
 *
 * SVG ATAYLAB yo'q: uning ichida skript bo'lishi mumkin va u to'g'ridan-
 * to'g'ri ochilganda saytning o'z manzilida ishga tushardi. Seed bilan
 * kelgan `/questions/*.svg` rasmlari — bizning o'z fayllarimiz, ular
 * `public/` dan beriladi va bu yerga aloqasi yo'q.
 */
export const QUESTION_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

/** Yuklangan rasm shu manzil orqali beriladi. */
export const QUESTION_IMAGE_URL_PREFIX = "/api/question-images/";

/** Seed bilan kelgan, `public/` dagi rasmlar. */
const PUBLIC_IMAGE_PREFIX = "/questions/";

/**
 * `imageUrl` qabul qilinadimi.
 *
 * Faqat IKKI ko'rinish: o'zimiz yuklagan fayl yoki `public/questions`
 * dagi seed rasmi. Tashqi manzil (`https://...`) ataylab rad etiladi:
 * u boshqa saytga bog'liqlik hosil qiladi (rasm o'chsa savol buziladi),
 * o'quvchining brauzeridan o'sha saytga so'rov yuboradi va owner
 * hisobini olgan odam istalgan manzilni savolga qo'ya olardi.
 */
export function isAllowedQuestionImageUrl(url: string): boolean {
  return (
    (url.startsWith(QUESTION_IMAGE_URL_PREFIX) || url.startsWith(PUBLIC_IMAGE_PREFIX)) &&
    !url.includes("..")
  );
}
