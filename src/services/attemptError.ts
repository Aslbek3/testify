/**
 * Test urinishlari bilan bog'liq domen xatolari — "topilmadi", "ruxsat
 * yo'q", "allaqachon yakunlangan" kabi holatlarning barchasi shu orqali.
 * API route'lar `status`ni to'g'ridan-to'g'ri javobga qo'yadi.
 *
 * Nega alohida faylda: uni `attempts.ts`, `attemptScoring.ts` va
 * `attemptResults.ts` ning uchalasi ham ishlatadi. Bittasining ichida
 * tursa, fayllar bir-birini aylanma (circular) import qilib qolardi.
 */
export class AttemptError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
