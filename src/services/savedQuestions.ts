import { prisma } from "@/lib/prisma";
import { toStringArray } from "@/lib/json";

/**
 * "Saqlanganlar" — o'quvchi keyin qaytmoqchi bo'lgan savollar.
 *
 * Nega "Xatolarim" yetarli emas: u faqat XATO qilingan savollarni
 * yig'adi. To'g'ri javob berilgan, lekin tasodifan topilgan yoki
 * tushunilmagan savol hech qayerda qolmaydi — o'quvchi uni qayta
 * topa olmaydi.
 *
 * Bu servis o'quvchining O'Z ma'lumoti bilan ishlaydi: har bir funksiya
 * `studentId` oladi va faqat o'shaning yozuvlariga tegadi, ya'ni
 * begona savolni saqlab/o'chirib bo'lmaydi.
 */

export class SavedQuestionError extends Error {
  constructor(
    message: string,
    readonly status: number = 400
  ) {
    super(message);
  }
}

export type SavedQuestionItem = {
  questionId: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string | null;
  legalReference: string | null;
  topicName: string;
  imageUrl: string | null;
  imageAlt: string | null;
  savedAt: Date;
};

/**
 * Saqlaydi yoki saqlanganini bekor qiladi — bitta tugma uchun.
 *
 * @returns yangi holat: `true` — saqlangan, `false` — bekor qilingan.
 */
export async function toggleSavedQuestion(input: {
  studentId: string;
  questionId: string;
}): Promise<{ saved: boolean }> {
  const question = await prisma.question.findUnique({
    where: { id: input.questionId },
    select: { id: true },
  });
  if (!question) throw new SavedQuestionError("Savol topilmadi", 404);

  const existing = await prisma.savedQuestion.findUnique({
    where: {
      studentId_questionId: {
        studentId: input.studentId,
        questionId: input.questionId,
      },
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.savedQuestion.delete({ where: { id: existing.id } });
    return { saved: false };
  }

  await prisma.savedQuestion.create({
    data: { studentId: input.studentId, questionId: input.questionId },
  });
  return { saved: true };
}

/** Faqat ID'lar — test ekranida qaysi savol saqlanganini belgilash uchun. */
export async function listSavedQuestionIds(
  studentId: string,
  questionIds: string[]
): Promise<Set<string>> {
  if (questionIds.length === 0) return new Set();
  const rows = await prisma.savedQuestion.findMany({
    where: { studentId, questionId: { in: questionIds } },
    select: { questionId: true },
  });
  return new Set(rows.map((r) => r.questionId));
}

/** To'liq ro'yxat — "Saqlanganlar" sahifasi uchun, eng yangisi birinchi. */
export async function listSavedQuestions(
  studentId: string
): Promise<SavedQuestionItem[]> {
  const rows = await prisma.savedQuestion.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      question: {
        select: {
          id: true,
          text: true,
          options: true,
          correctOptionIndex: true,
          explanation: true,
          legalReference: true,
          imageUrl: true,
          imageAlt: true,
          topic: { select: { name: true } },
        },
      },
    },
  });

  return rows.map((row) => ({
    questionId: row.question.id,
    text: row.question.text,
    options: toStringArray(row.question.options),
    correctOptionIndex: row.question.correctOptionIndex,
    explanation: row.question.explanation,
    legalReference: row.question.legalReference,
    topicName: row.question.topic.name,
    imageUrl: row.question.imageUrl,
    imageAlt: row.question.imageAlt,
    savedAt: row.createdAt,
  }));
}

export async function countSavedQuestions(studentId: string): Promise<number> {
  return prisma.savedQuestion.count({ where: { studentId } });
}
