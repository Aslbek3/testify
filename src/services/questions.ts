import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toStringArray } from "@/lib/json";

/**
 * Savollar bazasi bilan bog'liq domen xatolari uchun maxsus xato turi.
 * API route'lar buni ushlab, foydalanuvchiga tushunarli xabar bilan
 * 400/409 status qaytaradi.
 */
export class QuestionBankError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuestionBankError";
  }
}

export type TopicWithQuestionCount = {
  id: string;
  name: string;
  questionCount: number;
};

export type QuestionListItem = {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  imageAlt: string | null;
};

export async function listTopicsWithQuestionCount(): Promise<
  TopicWithQuestionCount[]
> {
  const topics = await prisma.topic.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { questions: true } },
    },
  });

  return topics.map((topic) => ({
    id: topic.id,
    name: topic.name,
    questionCount: topic._count.questions,
  }));
}

export async function getTopic(topicId: string) {
  return prisma.topic.findUnique({ where: { id: topicId } });
}

export async function createTopic(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new QuestionBankError("Mavzu nomi bo'sh bo'lishi mumkin emas");
  }

  const existing = await prisma.topic.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
  });
  if (existing) {
    throw new QuestionBankError("Bunday nomli mavzu allaqachon mavjud");
  }

  return prisma.topic.create({ data: { name: trimmed } });
}

export async function listQuestionsForTopic(
  topicId: string
): Promise<QuestionListItem[]> {
  const questions = await prisma.question.findMany({
    where: { topicId },
    orderBy: { text: "asc" },
  });

  return questions.map((question) => ({
    id: question.id,
    text: question.text,
    options: toStringArray(question.options),
    correctOptionIndex: question.correctOptionIndex,
    imageAlt: question.imageAlt,
  }));
}

function validateQuestionInput(input: {
  text: string;
  options: string[];
  correctOptionIndex: number;
}) {
  const text = input.text.trim();
  if (!text) {
    throw new QuestionBankError("Savol matni bo'sh bo'lishi mumkin emas");
  }
  if (input.options.length !== 4) {
    throw new QuestionBankError("Savolda aynan 4 ta variant bo'lishi kerak");
  }
  if (input.options.some((option) => !option.trim())) {
    throw new QuestionBankError("Barcha variantlar to'ldirilishi shart");
  }
  if (
    !Number.isInteger(input.correctOptionIndex) ||
    input.correctOptionIndex < 0 ||
    input.correctOptionIndex > 3
  ) {
    throw new QuestionBankError(
      "To'g'ri javob 1-4 variantlardan biri bo'lishi kerak"
    );
  }
}

export async function createQuestion(input: {
  topicId: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  imageAlt?: string | null;
}) {
  validateQuestionInput(input);

  return prisma.question.create({
    data: {
      topicId: input.topicId,
      text: input.text.trim(),
      options: input.options.map((option) => option.trim()),
      correctOptionIndex: input.correctOptionIndex,
      imageAlt: input.imageAlt?.trim() || null,
    },
  });
}

export async function updateQuestion(
  id: string,
  input: {
    text: string;
    options: string[];
    correctOptionIndex: number;
    imageAlt?: string | null;
  }
) {
  validateQuestionInput(input);

  return prisma.question.update({
    where: { id },
    data: {
      text: input.text.trim(),
      options: input.options.map((option) => option.trim()),
      correctOptionIndex: input.correctOptionIndex,
      imageAlt: input.imageAlt?.trim() || null,
    },
  });
}

export async function deleteQuestion(id: string): Promise<void> {
  try {
    await prisma.question.delete({ where: { id } });
  } catch (error) {
    // Postgres'ning RESTRICT FK xatosi (23001 — AttemptAnswer bu savolga
    // ishora qilyapti) Prisma orqali har doim ham "Known" P2003 sifatida
    // kelavermaydi — bu holatda PrismaClientUnknownRequestError sifatida
    // chiqadi, xabar ichida ham "foreign key constraint" bo'ladi. Shuning
    // uchun ikkala shaklni ham ushlaymiz.
    const isForeignKeyViolation =
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003") ||
      (error instanceof Prisma.PrismaClientUnknownRequestError &&
        error.message.includes("foreign key constraint"));

    if (isForeignKeyViolation) {
      throw new QuestionBankError(
        "Bu savol allaqachon urinishlarda javob berilgan, shuning uchun o'chirib bo'lmaydi."
      );
    }
    throw error;
  }
}
