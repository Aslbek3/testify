import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types/auth";
import {
  AttemptError,
  MARATHON_MAX_QUESTIONS,
  MARATHON_MIN_QUESTIONS,
  startAttempt,
} from "@/services/attempts";
import { getStudentGroupId } from "@/services/studentDashboard";

/**
 * "Raqamli savollar" — ichida son bor savollar.
 *
 * Nega alohida rejim: YHQ'ning yodlash eng qiyin qismi aynan raqamlar —
 * tezlik chegaralari, masofalar, o'lchamlar, muddatlar. Ular mavzular
 * bo'ylab tarqoq yotadi, ya'ni oddiy mashqda tasodifan uchraydi. Bu
 * rejim ularni bir joyga yig'adi.
 *
 * Savol "raqamli" deb topiladi, agar SON matnida yoki VARIANTLARIDA
 * uchrasa. Faqat matnga qarash yetarli emas: "Ruxsat etilgan eng katta
 * tezlik qancha?" degan savolning o'zida raqam yo'q, javoblari esa
 * butunlay raqamdan iborat.
 *
 * Alohida maydon (`isNumeric`) ATAYLAB qo'shilmadi: u har bir savol
 * kiritilganda qo'lda belgilanishi kerak bo'lardi va vaqt o'tib
 * ma'lumotdan chetga chiqib ketardi. Bu yerda esa shart doim savolning
 * hozirgi matnidan hisoblanadi.
 */

/**
 * Sonni topadigan shart — ikkala so'rovda bir xil ishlatiladi.
 *
 * `Prisma.raw` bu yerda xavfsiz: qator o'zgarmas (const), ichiga hech
 * qanday foydalanuvchi ma'lumoti tushmaydi. Alohida turishining sababi —
 * shart ikki joyda bir xil bo'lishi shart, aks holda "nechta savol bor"
 * degan son boshlanadigan test bilan mos kelmay qolardi.
 */
const NUMERIC_WHERE = Prisma.raw(`("text" ~ '[0-9]' OR "options"::text ~ '[0-9]')`);

export async function countNumericQuestions(): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) AS count FROM "Question" WHERE ${NUMERIC_WHERE}
  `;
  return Number(rows[0]?.count ?? 0);
}

/**
 * Raqamli savollardan mashq boshlaydi.
 *
 * Rejim — mashq (izoh darhol ochiladi): bu o'rganish vositasi, bilim
 * o'lchovi emas. `source` "PRACTICE" bo'lib qoladi — yangi manba qiymati
 * qo'shilsa, u "Xatolarim" filtri va barcha panellarga tarqalardi,
 * foydasi esa shunga arzimaydi.
 */
export async function startNumericAttempt(input: {
  user: SessionUser;
  questionCount?: number;
}): Promise<{ attemptId: string }> {
  // Tasodifiy tartib — har safar bir xil savollar chiqmasin.
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "Question"
    WHERE ${NUMERIC_WHERE}
    ORDER BY random()
    LIMIT ${MARATHON_MAX_QUESTIONS}
  `;
  if (rows.length < MARATHON_MIN_QUESTIONS) {
    throw new AttemptError(
      `Raqamli savollar yetarli emas: kamida ${MARATHON_MIN_QUESTIONS} ta kerak, bazada ${rows.length} ta`,
      404
    );
  }

  const questionIds = rows.map((r) => r.id);
  const requested = input.questionCount;
  const count =
    requested !== undefined && requested >= MARATHON_MIN_QUESTIONS
      ? Math.min(requested, questionIds.length)
      : questionIds.length;

  const started = await startAttempt({
    user: input.user,
    mode: "PRACTICE",
    groupId: await getStudentGroupId(input.user.id),
    questionIds: questionIds.slice(0, count),
    questionCount: count,
  });
  return { attemptId: started.attemptId };
}
