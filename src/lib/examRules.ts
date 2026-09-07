import type { AttemptMode } from "@prisma/client";

/**
 * Imtihon/mashq qoidalarining YAGONA manbasi.
 *
 * Bu yerda Prisma ishlatilmaydi (faqat enum tipi import qilinadi), shuning
 * uchun uni ham `services/`, ham `lib/`, ham server komponentlari bemalol
 * import qila oladi. Ilgari bu qiymatlar `services/attempts.ts` ichida
 * yashiringan edi, `lib/readiness.ts` esa o'zining alohida chegaralarini
 * saqlar edi — natijada "Tayyor" degan yorliq haqiqiy o'tish balli bilan
 * mos kelmay qolgan edi.
 */
export const QUESTION_COUNT: Record<AttemptMode, number> = {
  PRACTICE: 10,
  EXAM: 20,
};

/** Imtihonga ajratilgan vaqt. */
export const EXAM_DURATION_SECONDS = 25 * 60;

/** O'tish sharti: 20 tadan ko'pi bilan 2 tasi xato bo'lishi mumkin. */
export const EXAM_MAX_WRONG = 2;

/**
 * O'sha qoidaning foizdagi ko'rinishi (20 tadan 18 tasi = 90%).
 * Ataylab hisoblab olinadi — savollar soni yoki ruxsat etilgan xato soni
 * o'zgarsa, tayyorgarlik chegarasi ham avtomatik siljiydi.
 */
export const EXAM_PASS_PERCENT = Math.round(
  ((QUESTION_COUNT.EXAM - EXAM_MAX_WRONG) / QUESTION_COUNT.EXAM) * 100
);
