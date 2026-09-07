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

// Imtihon qoidalari (savollar soni, vaqt, ruxsat etilgan xato) yagona
// manbada — `lib/examRules.ts`. Tayyorgarlik chegarasi (`lib/readiness.ts`)
// ham o'sha yerdan kelib chiqadi, shunda yorliq va haqiqiy o'tish balli
// bir-biridan ajralib ketmaydi.
import {
  QUESTION_COUNT,
  EXAM_DURATION_SECONDS,
  EXAM_MAX_WRONG,
} from "@/lib/examRules";

/** TestRunner klient komponenti buni props orqali oladi. */
export { EXAM_DURATION_SECONDS };

export type AttemptQuestionForClient = {
  id: string;
  text: string;
  options: string[];
  imageUrl: string | null;
  imageAlt: string | null;
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
  if (input.mode === "EXAM" && candidates.length < targetCount) {
    throw new AttemptError("Imtihon uchun savollar yetarli emas", 400);
  }

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
      imageAlt: true,
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
      imageAlt: q.imageAlt,
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
    select: { studentId: true, mode: true, finishedAt: true, questionIds: true, startedAt: true },
  });
  if (!attempt) throw new AttemptError("Urinish topilmadi", 404);
  if (!canTakeAttempt(input.user, attempt)) {
    throw new AttemptError("Bu urinish sizga tegishli emas", 403);
  }
  if (attempt.finishedAt) {
    throw new AttemptError("Bu urinish allaqachon yakunlangan", 409);
  }
  // Aks holda o'quvchi boshqa (o'z urinishiga tegishli bo'lmagan) savollarga
  // ham javob yuborib, correctCount'ni totalCount'dan oshirib yuborishi mumkin.
  if (!attempt.questionIds.includes(input.questionId)) {
    throw new AttemptError("Bu savol urinishga tegishli emas", 400);
  }
  if (attempt.mode === "EXAM") {
    const elapsedSeconds = (Date.now() - attempt.startedAt.getTime()) / 1000;
    if (elapsedSeconds > EXAM_DURATION_SECONDS) {
      throw new AttemptError("Imtihon vaqti tugagan", 409);
    }
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

export type ResumeAnswerState = {
  questionId: string;
  selectedOptionIndex: number;
  // Faqat PRACTICE rejimida to'ldiriladi — EXAM'da urinish tugamaguncha
  // to'g'ri/xato ma'lumoti hech qachon qaytarilmaydi, hatto qayta
  // ochilganda ham.
  isCorrect?: boolean;
  correctOptionIndex?: number;
  explanation?: string | null;
};

export type ResumableAttempt = {
  attemptId: string;
  mode: AttemptMode;
  startedAt: Date;
  finishedAt: Date | null;
  questions: AttemptQuestionForClient[];
  answers: ResumeAnswerState[];
};

/**
 * Sahifa yangilansa yoki keyinroq qaytilsa urinishni davom ettirish uchun —
 * boshlanishda tanlangan savollarni AYNI o'sha tartibda va hozirgi
 * progressni qaytaradi.
 */
export async function getAttemptForResume(input: {
  user: SessionUser;
  attemptId: string;
}): Promise<ResumableAttempt> {
  // Urinishni ochishdan OLDIN o'quvchining vaqti tugagan imtihonlarini
  // yakunlaymiz — shunda ancha oldin tashlab ketilgan imtihonga qaytilganda
  // o'lik taymer emas, natija sahifasi ochiladi (sahifa `finishedAt`
  // to'ldirilgan bo'lsa `/natija`ga yo'naltiradi).
  if (input.user.role === "STUDENT") {
    await finalizeExpiredAttempts(input.user.id);
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: input.attemptId },
    select: {
      studentId: true,
      mode: true,
      startedAt: true,
      finishedAt: true,
      questionIds: true,
    },
  });
  if (!attempt) throw new AttemptError("Urinish topilmadi", 404);
  if (!canTakeAttempt(input.user, attempt)) {
    throw new AttemptError("Bu urinish sizga tegishli emas", 403);
  }

  const [questions, savedAnswers] = await Promise.all([
    prisma.question.findMany({
      where: { id: { in: attempt.questionIds } },
      select: {
        id: true,
        text: true,
        options: true,
        imageUrl: true,
        imageAlt: true,
        topicId: true,
        topic: { select: { name: true } },
        ...(attempt.mode === "PRACTICE"
          ? { correctOptionIndex: true, explanation: true }
          : {}),
      },
    }),
    prisma.attemptAnswer.findMany({
      where: { attemptId: input.attemptId },
      select: { questionId: true, selectedOptionIndex: true, isCorrect: true },
    }),
  ]);

  const byId = new Map(questions.map((q) => [q.id, q]));
  const orderedQuestions = attempt.questionIds
    .map((id) => byId.get(id))
    .filter((q): q is NonNullable<typeof q> => q !== undefined);

  const answers: ResumeAnswerState[] = savedAnswers.map((a) => {
    if (attempt.mode !== "PRACTICE") {
      return { questionId: a.questionId, selectedOptionIndex: a.selectedOptionIndex };
    }
    const question = byId.get(a.questionId) as
      | { correctOptionIndex?: number; explanation?: string | null }
      | undefined;
    return {
      questionId: a.questionId,
      selectedOptionIndex: a.selectedOptionIndex,
      isCorrect: a.isCorrect,
      correctOptionIndex: question?.correctOptionIndex,
      explanation: question?.explanation ?? null,
    };
  });

  return {
    attemptId: input.attemptId,
    mode: attempt.mode,
    startedAt: attempt.startedAt,
    finishedAt: attempt.finishedAt,
    questions: orderedQuestions.map((q) => ({
      id: q.id,
      text: q.text,
      options: toStringArray(q.options),
      imageUrl: q.imageUrl,
      imageAlt: q.imageAlt,
      topicId: q.topicId,
      topicName: q.topic.name,
    })),
    answers,
  };
}

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

  let closedCount = 0;
  for (const attempt of expired) {
    const { score } = await scoreAttempt(attempt);

    // Shartli (atomik) yangilanish — shu payt o'quvchi boshqa yorliqda
    // urinishni haqiqiy "Yakunlash" tugmasi bilan yopayotgan bo'lishi
    // mumkin; `finishedAt: null` sharti tufayli faqat bittasi yozadi.
    const updated = await prisma.attempt.updateMany({
      where: { id: attempt.id, finishedAt: null },
      // Yakunlanish vaqti — imtihon muddati tugagan lahza, hozirgi vaqt
      // emas: urinish aslida o'shanda tugagan, o'quvchi ilovani bir oydan
      // keyin ochgani tarixni siljitmasligi kerak.
      data: {
        finishedAt: new Date(
          attempt.startedAt.getTime() + EXAM_DURATION_SECONDS * 1000
        ),
        score,
      },
    });
    closedCount += updated.count;
  }

  return closedCount;
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
  const updated = await prisma.attempt.updateMany({
    where: { id: input.attemptId, finishedAt: null },
    data: { finishedAt: new Date(), score },
  });
  if (updated.count === 0) {
    throw new AttemptError("Bu urinish allaqachon yakunlangan", 409);
  }

  return { score, correctCount, totalCount };
}

export type TopicBreakdownRow = {
  topicId: string;
  topicName: string;
  correct: number;
  total: number;
};

export type MissedQuestion = {
  questionId: string;
  text: string;
  selectedOptionText: string | null;
  correctOptionText: string;
  explanation: string | null;
};

export type AttemptResult = {
  attemptId: string;
  mode: AttemptMode;
  score: number;
  correctCount: number;
  totalCount: number;
  /** PRACTICE uchun null — "o'tish/o'tmaslik" tushunchasi faqat EXAM'ga tegishli. */
  passed: boolean | null;
  /** O'tish uchun kerakli eng kam to'g'ri javoblar soni — faqat EXAM uchun. */
  passThreshold: number | null;
  topicBreakdown: TopicBreakdownRow[];
  missedQuestions: MissedQuestion[];
};

export async function getAttemptResult(input: {
  user: SessionUser;
  attemptId: string;
}): Promise<AttemptResult> {
  const attempt = await prisma.attempt.findUnique({
    where: { id: input.attemptId },
    select: {
      studentId: true,
      mode: true,
      startedAt: true,
      finishedAt: true,
      score: true,
      questionIds: true,
    },
  });
  if (!attempt) throw new AttemptError("Urinish topilmadi", 404);
  if (!canTakeAttempt(input.user, attempt)) {
    throw new AttemptError("Bu urinish sizga tegishli emas", 403);
  }
  if (!attempt.finishedAt) {
    throw new AttemptError("Bu urinish hali yakunlanmagan", 409);
  }

  const [questions, allSavedAnswers] = await Promise.all([
    prisma.question.findMany({
      where: { id: { in: attempt.questionIds } },
      select: {
        id: true,
        text: true,
        options: true,
        correctOptionIndex: true,
        explanation: true,
        topicId: true,
        topic: { select: { name: true } },
      },
    }),
    prisma.attemptAnswer.findMany({
      where: { attemptId: input.attemptId, questionId: { in: attempt.questionIds } },
      select: {
        questionId: true,
        selectedOptionIndex: true,
        isCorrect: true,
        answeredAt: true,
      },
    }),
  ]);

  // finishAttempt ballni hisoblashda EXAM vaqti tugagandan keyin kelgan
  // javoblarni chiqarib tashlaydi. Bu yerda ham AYNI filtr qo'llanishi
  // shart — aks holda saqlangan ball (filtrlangan) bilan shu sahifada
  // qayta hisoblangan correctCount/passed (filtrlanmagan) bir-biriga zid
  // bo'lib qolardi: masalan 75% ball ustida "O'TDI" yozuvi chiqishi mumkin edi.
  const savedAnswers =
    attempt.mode === "EXAM"
      ? allSavedAnswers.filter(
          (a) =>
            (a.answeredAt.getTime() - attempt.startedAt.getTime()) / 1000 <=
            EXAM_DURATION_SECONDS
        )
      : allSavedAnswers;

  const questionById = new Map(questions.map((q) => [q.id, q]));
  const answerByQuestionId = new Map(savedAnswers.map((a) => [a.questionId, a]));

  const topicMap = new Map<string, TopicBreakdownRow>();
  for (const qid of attempt.questionIds) {
    const question = questionById.get(qid);
    if (!question) continue;
    const entry = topicMap.get(question.topicId) ?? {
      topicId: question.topicId,
      topicName: question.topic.name,
      correct: 0,
      total: 0,
    };
    entry.total += 1;
    if (answerByQuestionId.get(qid)?.isCorrect) entry.correct += 1;
    topicMap.set(question.topicId, entry);
  }

  const missedQuestions: MissedQuestion[] = attempt.questionIds
    .map((qid) => questionById.get(qid))
    .filter((q): q is NonNullable<typeof q> => q !== undefined)
    .filter((q) => !answerByQuestionId.get(q.id)?.isCorrect)
    .map((q) => {
      const options = toStringArray(q.options);
      const answer = answerByQuestionId.get(q.id);
      return {
        questionId: q.id,
        text: q.text,
        selectedOptionText:
          answer !== undefined ? (options[answer.selectedOptionIndex] ?? null) : null,
        correctOptionText: options[q.correctOptionIndex] ?? "",
        explanation: q.explanation,
      };
    });

  const totalCount = attempt.questionIds.length;
  const correctCount = savedAnswers.filter((a) => a.isCorrect).length;
  const wrongCount = totalCount - correctCount;
  const score = attempt.score ?? 0;

  return {
    attemptId: input.attemptId,
    mode: attempt.mode,
    score,
    correctCount,
    totalCount,
    passed: attempt.mode === "EXAM" ? wrongCount <= EXAM_MAX_WRONG : null,
    passThreshold: attempt.mode === "EXAM" ? totalCount - EXAM_MAX_WRONG : null,
    topicBreakdown: Array.from(topicMap.values()),
    missedQuestions,
  };
}
