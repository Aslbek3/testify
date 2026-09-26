import type { AttemptMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canTakeAttempt } from "@/lib/permissions";
import { EXAM_DURATION_SECONDS } from "@/lib/examRules";
import type { SessionUser } from "@/types/auth";
import { AttemptError } from "@/services/attemptError";

/**
 * Urinishni BALLASH va YOPISH.
 *
 * `attempts.ts` dan ajratilgan (2026-09-27): u 976 qatorga yetgan va
 * ichida uchta boshqa-boshqa ish bor edi — test yechish oqimi, ballash,
 * natija. Ballash qoidasi eng nozik qismi (u pul emas, lekin o'quvchining
 * bahosi), shuning uchun u alohida va qisqa faylda tursin.
 *
 * Bu yerdagi hammasi `attempts.ts` orqali qayta eksport qilinadi —
 * chaqiruvchi fayllar o'zgarmadi.
 */

/**
 * Urinishning ballini hisoblaydi — bu YAGONA hisoblash joyi.
 *
 * `finishAttempt` (o'quvchi/taymer yakunlagan holat) ham,
 * `finalizeExpiredAttempts` (tashlab ketilgan imtihon) ham shu funksiyani
 * chaqiradi, shunda ikki yo'l hech qachon boshqacha ball bermaydi.
 */
async function scoreAttempt(attempt: {
  id: string;
  mode: AttemptMode;
  startedAt: Date;
  questionIds: string[];
}): Promise<{ score: number; correctCount: number; totalCount: number }> {
  // questionId filtri — urinishga tegishli bo'lmagan javoblar (masalan eski
  // ma'lumot yoki chetlab o'tilgan tekshiruv) ballga qo'shilmasin.
  const answers = await prisma.attemptAnswer.findMany({
    where: { attemptId: attempt.id, questionId: { in: attempt.questionIds } },
    select: { isCorrect: true, answeredAt: true },
  });

  return computeScore(attempt, answers);
}

/**
 * Ball formulasining o'zi — bazaga murojaat qilmaydi.
 *
 * `scoreAttempt` dan alohida turadi, chunki `finalizeExpiredAttempts` bir
 * nechta urinishni birdan yopadi va ularning javoblarini BITTA so'rov bilan
 * oladi. Formula esa baribir yagona joyda qolishi shart — aks holda ikki yo'l
 * bir xil urinishga boshqa-boshqa ball berib qo'yishi mumkin.
 */
// `export` — birlik testlari uchun ham: bu ballash formulasining
// O'ZI va u bazaga bormaydi, ya'ni uni sekundning mingdan birida
// tekshirish mumkin. Ilova kodidan uni faqat shu fayl chaqiradi.
export function computeScore(
  attempt: { mode: AttemptMode; startedAt: Date; questionIds: string[] },
  answers: { isCorrect: boolean; answeredAt: Date }[]
): { score: number; correctCount: number; totalCount: number } {
  // Vaqt tugagach ham urinish normal yakunlanadi, lekin EXAM rejimida
  // limitdan keyin kelgan javoblar (soatlar sinxron emasligi yoki
  // saveAnswer'ning 409'dan oldin qabul qilib ulgurgan chekka holat uchun)
  // hisobga olinmaydi.
  const validAnswers =
    attempt.mode === "EXAM"
      ? answers.filter(
          (a) =>
            (a.answeredAt.getTime() - attempt.startedAt.getTime()) / 1000 <=
            EXAM_DURATION_SECONDS
        )
      : answers;

  const totalCount = attempt.questionIds.length;
  const correctCount = validAnswers.filter((a) => a.isCorrect).length;
  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  return { score, correctCount, totalCount };
}

/**
 * Vaqti tugagan, lekin yakunlanmay qolgan imtihonlarni yopadi.
 *
 * Muammo: brauzer yorlig'i ochiq turganda `TestRunner` taymeri imtihonni
 * o'zi yakunlaydi, lekin o'quvchi yorliqni imtihon o'rtasida yopib qo'ysa,
 * server tomonda hech narsa uni yopmaydi — urinish abadiy
 * `finishedAt: null`, `score: null` bo'lib qoladi va barcha statistikadan
 * bildirmay tushib qoladi. Bu yerda o'sha urinishlar AYNI taymer
 * qoidalari bo'yicha (qisman ball bilan) yakunlanadi.
 *
 * ⚠️ Bu "yalqov" (lazy) yakunlash: hech qanday cron yo'q, faqat o'quvchi
 * ilovani keyingi marta ochganda ishlaydi. Ya'ni ustoz tashlab ketilgan
 * urinishni o'quvchi ilovaga qaytmaguncha statistikada ko'rmasligi mumkin.
 *
 * @returns nechta urinish yopilgani.
 */
export async function finalizeExpiredAttempts(studentId: string): Promise<number> {
  const expiryCutoff = new Date(Date.now() - EXAM_DURATION_SECONDS * 1000);

  const expired = await prisma.attempt.findMany({
    where: {
      studentId,
      mode: "EXAM",
      finishedAt: null,
      startedAt: { lt: expiryCutoff },
    },
    select: { id: true, mode: true, startedAt: true, questionIds: true },
  });

  if (expired.length === 0) return 0;

  // Barcha tashlab ketilgan urinishlarning javoblari BITTA so'rovda olinadi.
  // Ilgari sikl ichida urinish boshiga ikkita so'rov ketardi: 2 oy ilovaga
  // kirmagan o'quvchida 25 ta ochiq imtihon to'planib qolsa, panel
  // ochilishidan oldin 50 ta ketma-ket so'rov bajarilardi.
  const allAnswers = await prisma.attemptAnswer.findMany({
    where: { attemptId: { in: expired.map((a) => a.id) } },
    select: { attemptId: true, questionId: true, isCorrect: true, answeredAt: true },
  });

  const answersByAttempt = new Map<string, typeof allAnswers>();
  for (const answer of allAnswers) {
    const list = answersByAttempt.get(answer.attemptId) ?? [];
    list.push(answer);
    answersByAttempt.set(answer.attemptId, list);
  }

  const updates = expired.map((attempt) => {
    // questionId filtri `scoreAttempt` dagidek — urinishga tegishli
    // bo'lmagan javob ballga qo'shilmasin.
    const answers = (answersByAttempt.get(attempt.id) ?? []).filter((a) =>
      attempt.questionIds.includes(a.questionId)
    );
    const { score } = computeScore(attempt, answers);

    // Shartli (atomik) yangilanish — shu payt o'quvchi boshqa yorliqda
    // urinishni haqiqiy "Yakunlash" tugmasi bilan yopayotgan bo'lishi
    // mumkin; `finishedAt: null` sharti tufayli faqat bittasi yozadi.
    return prisma.attempt.updateMany({
      where: { id: attempt.id, finishedAt: null },
      // Yakunlanish vaqti — imtihon muddati tugagan lahza, hozirgi vaqt
      // emas: urinish aslida o'shanda tugagan, o'quvchi ilovani bir oydan
      // keyin ochgani tarixni siljitmasligi kerak. `finishAttempt` ham
      // vaqti tugagan imtihonga AYNI shu vaqtni yozadi.
      data: {
        finishedAt: expiredFinishedAt(attempt.startedAt),
        score,
      },
    });
  });

  const results = await prisma.$transaction(updates);
  return results.reduce((sum, result) => sum + result.count, 0);
}

/** Vaqti tugagan imtihon qachon yakunlangan hisoblanadi. */
function expiredFinishedAt(startedAt: Date): Date {
  return new Date(startedAt.getTime() + EXAM_DURATION_SECONDS * 1000);
}

/**
 * Urinishni HOZIR yopadi — ruxsat tekshirmasdan.
 *
 * `finishAttempt` dan farqi: chaqiruvchi egalikni allaqachon tekshirgan
 * (`saveAnswer` ichidan chaqiriladi) va "allaqachon yakunlangan" holati
 * xato emas — shartli `updateMany` buni o'zi hal qiladi.
 */
export async function closeAttemptNow(attempt: {
  id: string;
  mode: AttemptMode;
  startedAt: Date;
  questionIds: string[];
}): Promise<void> {
  const { score } = await scoreAttempt(attempt);

  // `finishAttempt` bilan AYNI qoida: vaqti tugagan imtihon "hozir" emas,
  // muddat tugagan lahzada yakunlangan deb yoziladi.
  const expiryAt = expiredFinishedAt(attempt.startedAt);
  const now = new Date();
  const finishedAt = attempt.mode === "EXAM" && now > expiryAt ? expiryAt : now;

  await prisma.attempt.updateMany({
    where: { id: attempt.id, finishedAt: null },
    data: { finishedAt, score },
  });
}

export async function finishAttempt(input: {
  user: SessionUser;
  attemptId: string;
}): Promise<{ score: number; correctCount: number; totalCount: number }> {
  const attempt = await prisma.attempt.findUnique({
    where: { id: input.attemptId },
    select: { studentId: true, mode: true, startedAt: true, finishedAt: true, questionIds: true },
  });
  if (!attempt) throw new AttemptError("Urinish topilmadi", 404);
  if (!canTakeAttempt(input.user, attempt)) {
    throw new AttemptError("Bu urinish sizga tegishli emas", 403);
  }
  if (attempt.finishedAt) {
    throw new AttemptError("Bu urinish allaqachon yakunlangan", 409);
  }

  const { score, correctCount, totalCount } = await scoreAttempt({
    id: input.attemptId,
    mode: attempt.mode,
    startedAt: attempt.startedAt,
    questionIds: attempt.questionIds,
  });

  // Shartli (atomik) yangilanish: yuqoridagi `finishedAt` tekshiruvi bilan
  // shu yozuv orasida boshqa so'rov urinishni yakunlab ulgurishi mumkin
  // (masalan taymer avtomatik yakunlashi va foydalanuvchining "Yakunlash"
  // tugmasi deyarli bir vaqtda ishlaganda). `finishedAt: null` shartini
  // WHERE'ga qo'shsak, faqat birinchi so'rov yozadi.
  // Vaqti allaqachon tugagan imtihon "hozir" emas, muddat tugagan lahzada
  // yakunlangan deb yoziladi — `finalizeExpiredAttempts` bilan bir xil.
  // Ilgari ikki yo'l bir xil urinishga turli `finishedAt` yozardi: brauzer
  // yorlig'i uch soat ochiq qolib, keyin "Yakunlash" bosilsa, 25 daqiqalik
  // imtihon uch soat davom etgandek ko'rinardi va ustozning "oxirgi faollik"
  // ustunini siljitardi.
  const expiryAt = expiredFinishedAt(attempt.startedAt);
  const now = new Date();
  const finishedAt =
    attempt.mode === "EXAM" && now > expiryAt ? expiryAt : now;

  const updated = await prisma.attempt.updateMany({
    where: { id: input.attemptId, finishedAt: null },
    data: { finishedAt, score },
  });
  if (updated.count === 0) {
    throw new AttemptError("Bu urinish allaqachon yakunlangan", 409);
  }

  return { score, correctCount, totalCount };
}
