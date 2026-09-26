import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types/auth";
import {
  AttemptError,
  MARATHON_MIN_QUESTIONS,
  MARATHON_MAX_QUESTIONS,
  startAttempt,
} from "@/services/attempts";
import { getStudentGroupId } from "@/services/studentDashboard";

/**
 * Biletlar — rasmiy imtihondagi kabi qat'iy savollar to'plami.
 *
 * Nega kerak: o'quvchi imtihonga biletlar bo'yicha tayyorlanadi va
 * "8-biletni ishladim" deb gapiradi. Tasodifiy mashqda esa bir xil
 * to'plam ikki marta chiqmaydi — o'quvchi o'z bilimini rasmiy format
 * bilan solishtira olmaydi.
 *
 * Bilet — `Question.ticketNumber` va `ticketOrder` maydonlari (alohida
 * jadval emas: bilet savollarning tartibli ro'yxatidan boshqa narsa
 * emas). Ular odatda import orqali to'ldiriladi.
 */

export type TicketSummary = {
  number: number;
  questionCount: number;
};

/** Mavjud biletlar va ulardagi savollar soni — o'quvchi ro'yxati uchun. */
export async function listTickets(): Promise<TicketSummary[]> {
  const rows = await prisma.question.groupBy({
    by: ["ticketNumber"],
    where: { ticketNumber: { not: null } },
    _count: { _all: true },
    orderBy: { ticketNumber: "asc" },
  });
  return rows.map((row) => ({
    number: row.ticketNumber as number,
    questionCount: row._count._all,
  }));
}

export type TicketProgress = {
  /** Shu biletdan nechta savolga javob berilgan (yakunlangan urinishlarda). */
  answeredCount: number;
  /** Shundan nechtasining SO'NGGI javobi hali ham xato. */
  wrongCount: number;
};

/**
 * O'quvchining biletlar bo'yicha holati — ro'yxatdagi filtr uchun.
 *
 * "Xato" ning ta'rifi `getStudentMistakes` bilan AYNI: savolning so'nggi
 * javobi noto'g'ri bo'lsa, u hali hal qilinmagan hisoblanadi. Ikki joyda
 * ikki xil ta'rif bo'lsa, "Xatolar" filtridagi bilet "Xatolarim"
 * bo'limida ko'rinmay qolishi mumkin edi.
 *
 * Faqat YAKUNLANGAN urinishlar sanaladi — yarmida tashlab ketilgan bilet
 * "ishlangan" emas.
 */
export async function getTicketProgressForStudent(
  studentId: string
): Promise<Map<number, TicketProgress>> {
  const rows = await prisma.$queryRaw<
    { number: number; answeredCount: number; wrongCount: number }[]
  >`
    WITH answers AS (
      SELECT aa."questionId", aa."isCorrect", aa."answeredAt", aa."id"
      FROM "AttemptAnswer" aa
      JOIN "Attempt" a ON a."id" = aa."attemptId"
      WHERE a."studentId" = ${studentId}
        AND a."finishedAt" IS NOT NULL
    ),
    per_question AS (
      SELECT
        "questionId",
        (array_agg("isCorrect" ORDER BY "answeredAt" DESC, "id" DESC))[1]
          AS "lastIsCorrect"
      FROM answers
      GROUP BY "questionId"
    )
    SELECT
      q."ticketNumber"                                        AS "number",
      COUNT(*)::int                                           AS "answeredCount",
      COUNT(*) FILTER (WHERE NOT p."lastIsCorrect")::int       AS "wrongCount"
    FROM per_question p
    JOIN "Question" q ON q."id" = p."questionId"
    WHERE q."ticketNumber" IS NOT NULL
    GROUP BY q."ticketNumber"
  `;

  return new Map(
    rows.map((row) => [
      row.number,
      { answeredCount: row.answeredCount, wrongCount: row.wrongCount },
    ])
  );
}

/**
 * Biletni boshlash.
 *
 * Savollar biletdagi TARTIBDA beriladi (`keepOrder`) — rasmiy biletda ham
 * ular har doim bir xil ketma-ketlikda turadi.
 *
 * Rejim — mashq: javob darhol tekshiriladi va izohi ko'rsatiladi. Bilet
 * o'rganish vositasi; imtihon qoidalari (taymer, 2 ta xato chegarasi)
 * "Imtihon" bo'limida qoladi.
 */
export async function startTicketAttempt(input: {
  user: SessionUser;
  ticketNumber: number;
}): Promise<{ attemptId: string }> {
  if (!Number.isInteger(input.ticketNumber) || input.ticketNumber < 1) {
    throw new AttemptError("Bilet raqami noto'g'ri", 404);
  }

  const questions = await prisma.question.findMany({
    where: { ticketNumber: input.ticketNumber },
    // `ticketOrder` bo'sh bo'lmasligi kerak (import shart qilib qo'yadi),
    // lekin eski ma'lumotda bo'sh chiqsa savol oxiriga tushadi.
    orderBy: [{ ticketOrder: "asc" }, { text: "asc" }],
    select: { id: true },
  });
  if (questions.length === 0) {
    throw new AttemptError("Bunday bilet topilmadi", 404);
  }

  const questionIds = questions.slice(0, MARATHON_MAX_QUESTIONS).map((q) => q.id);
  const started = await startAttempt({
    user: input.user,
    mode: "PRACTICE",
    source: "TICKET",
    groupId: await getStudentGroupId(input.user.id),
    questionIds,
    keepOrder: true,
    // Savollar soni biletdagidek bo'lishi kerak. Juda kichik bilet uchun
    // chegara pastdan cheklangani sabab standart son ishlatiladi —
    // tanlov baribir bilet savollari ichidan bo'ladi.
    questionCount:
      questionIds.length >= MARATHON_MIN_QUESTIONS ? questionIds.length : undefined,
  });
  return { attemptId: started.attemptId };
}
