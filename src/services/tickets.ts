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
