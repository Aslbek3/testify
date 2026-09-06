import type { AttemptMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canTakeAttempt } from "@/lib/permissions";
import { toStringArray } from "@/lib/json";
import type { SessionUser } from "@/types/auth";

/**
 * Test urinishlari bilan bog'liq domen xatolari — "topilmadi", "ruxsat
 * yo'q", "allaqachon yakunlangan" kabi holatlarning barchasi shu orqali.
 * API route'lar `status`ni to'g'ridan-to'g'ri javobga qo'yadi.
 */
export class AttemptError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const QUESTION_COUNT: Record<AttemptMode, number> = {
  PRACTICE: 10,
  EXAM: 20,
};

export type AttemptQuestionForClient = {
  id: string;
  text: string;
  options: string[];
  imageUrl: string | null;
  topicId: string;
  topicName: string;
};

/** Fisher-Yates — tasodifiy savol tanlash uchun. */
function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function startAttempt(input: {
  user: SessionUser;
  mode: AttemptMode;
  topicIds?: string[];
  groupId?: string | null;
}): Promise<{
  attemptId: string;
  mode: AttemptMode;
  questions: AttemptQuestionForClient[];
}> {
  if (input.user.role !== "STUDENT") {
    throw new AttemptError("Faqat o'quvchilar test boshlashi mumkin", 403);
  }

  const where =
    input.topicIds && input.topicIds.length > 0
      ? { topicId: { in: input.topicIds } }
      : {};

  const candidates = await prisma.question.findMany({ where, select: { id: true } });
  if (candidates.length === 0) {
    throw new AttemptError("Tanlangan mavzularda savollar topilmadi");
  }

  const targetCount = QUESTION_COUNT[input.mode];
  const selectedIds = shuffle(candidates)
    .slice(0, Math.min(targetCount, candidates.length))
    .map((c) => c.id);

  const attempt = await prisma.attempt.create({
    data: {
      studentId: input.user.id,
      mode: input.mode,
      groupId: input.groupId ?? null,
      questionIds: selectedIds,
    },
  });

  const questions = await prisma.question.findMany({
    where: { id: { in: selectedIds } },
    select: {
      id: true,
      text: true,
      options: true,
      imageUrl: true,
      topicId: true,
      topic: { select: { name: true } },
      // correctOptionIndex va explanation ATAYLAB tanlanmagan —
      // javob yuborilgunga qadar klientga hech qachon chiqmasin.
    },
  });

  // `in` so'rovi tartibni kafolatlamaydi — tasodifiy tanlangan tartibni
  // saqlab qolamiz.
  const byId = new Map(questions.map((q) => [q.id, q]));
  const ordered = selectedIds
    .map((id) => byId.get(id))
    .filter((q): q is NonNullable<typeof q> => q !== undefined);

  return {
    attemptId: attempt.id,
    mode: attempt.mode,
    questions: ordered.map((q) => ({
      id: q.id,
      text: q.text,
      options: toStringArray(q.options),
      imageUrl: q.imageUrl,
      topicId: q.topicId,
      topicName: q.topic.name,
    })),
  };
}

export type SaveAnswerResult =
  | { mode: "EXAM" }
  | {
      mode: "PRACTICE";
      isCorrect: boolean;
      correctOptionIndex: number;
      explanation: string | null;
    };

export async function saveAnswer(input: {
  user: SessionUser;
  attemptId: string;
  questionId: string;
  selectedOptionIndex: number;
}): Promise<SaveAnswerResult> {
  if (
    !Number.isInteger(input.selectedOptionIndex) ||
    input.selectedOptionIndex < 0 ||
    input.selectedOptionIndex > 3
  ) {
    throw new AttemptError("Noto'g'ri variant tanlandi");
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: input.attemptId },
    select: { studentId: true, mode: true, finishedAt: true },
  });
  if (!attempt) throw new AttemptError("Urinish topilmadi", 404);
  if (!canTakeAttempt(input.user, attempt)) {
    throw new AttemptError("Bu urinish sizga tegishli emas", 403);
  }
  if (attempt.finishedAt) {
    throw new AttemptError("Bu urinish allaqachon yakunlangan", 409);
  }

  const question = await prisma.question.findUnique({
    where: { id: input.questionId },
    select: { correctOptionIndex: true, explanation: true },
  });
  if (!question) throw new AttemptError("Savol topilmadi", 404);

  const isCorrect = input.selectedOptionIndex === question.correctOptionIndex;

  await prisma.attemptAnswer.upsert({
    where: {
      attemptId_questionId: {
        attemptId: input.attemptId,
        questionId: input.questionId,
      },
    },
    update: {
      selectedOptionIndex: input.selectedOptionIndex,
      isCorrect,
      answeredAt: new Date(),
    },
    create: {
      attemptId: input.attemptId,
      questionId: input.questionId,
      selectedOptionIndex: input.selectedOptionIndex,
      isCorrect,
    },
  });

  if (attempt.mode === "EXAM") {
    // Imtihon rejimida hech qanday feedback qaytarilmaydi.
    return { mode: "EXAM" };
  }

  return {
    mode: "PRACTICE",
    isCorrect,
    correctOptionIndex: question.correctOptionIndex,
    explanation: question.explanation,
  };
}

export async function finishAttempt(input: {
  user: SessionUser;
  attemptId: string;
}): Promise<{ score: number; correctCount: number; totalCount: number }> {
  const attempt = await prisma.attempt.findUnique({
    where: { id: input.attemptId },
    select: { studentId: true, finishedAt: true, questionIds: true },
  });
  if (!attempt) throw new AttemptError("Urinish topilmadi", 404);
  if (!canTakeAttempt(input.user, attempt)) {
    throw new AttemptError("Bu urinish sizga tegishli emas", 403);
  }
  if (attempt.finishedAt) {
    throw new AttemptError("Bu urinish allaqachon yakunlangan", 409);
  }

  const answers = await prisma.attemptAnswer.findMany({
    where: { attemptId: input.attemptId },
    select: { isCorrect: true },
  });

  const totalCount = attempt.questionIds.length;
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  await prisma.attempt.update({
    where: { id: input.attemptId },
    data: { finishedAt: new Date(), score },
  });

  return { score, correctCount, totalCount };
}
