import { Prisma, type AttemptMode } from "@prisma/client";
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

/**
 * Maratonda tanlash mumkin bo'lgan eng kam va eng ko'p savol soni.
 *
 * Yuqori chegara nima uchun kerak: son klientdan keladi va u to'g'ridan-to'g'ri
 * `questionIds` massivining hajmini belgilaydi. Cheklovsiz qoldirilsa, bitta
 * so'rov bilan o'n minglab savol so'rab, bazaga ham, xotiraga ham keraksiz
 * yuk tashlash mumkin edi. Amaldagi chegara baribir bazadagi savollar soni.
 */
export const MARATHON_MIN_QUESTIONS = 5;
export const MARATHON_MAX_QUESTIONS = 200;

/**
 * Bazadagi savollar soni — maraton sahifasi tanlov variantlarini shunga
 * qarab tuzadi. Bazada 60 ta savol bo'lsa "100 ta savol" tugmasini
 * ko'rsatish yolg'on va'da bo'lardi.
 */
export async function countAvailableQuestions(): Promise<number> {
  return prisma.question.count();
}

/** Urinishda nechta savol bo'lishini aniqlaydi. */
function resolveQuestionCount(mode: AttemptMode, requested?: number): number {
  // Imtihon soni muzokara qilinmaydi — u qoida.
  if (mode === "EXAM" || requested === undefined) return QUESTION_COUNT[mode];

  if (!Number.isInteger(requested)) {
    throw new AttemptError("Savollar soni butun son bo'lishi kerak");
  }
  if (requested < MARATHON_MIN_QUESTIONS || requested > MARATHON_MAX_QUESTIONS) {
    throw new AttemptError(
      `Savollar soni ${MARATHON_MIN_QUESTIONS} tadan ${MARATHON_MAX_QUESTIONS} tagacha bo'lishi kerak`
    );
  }
  return requested;
}

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
  /**
   * "Maraton" uchun — savollar sonini o'quvchi o'zi tanlaydi.
   *
   * Maraton ATAYLAB yangi `AttemptMode` emas: u mashqning varianti
   * (taymer yo'q, javob darhol ko'rsatiladi), farqi faqat savollar sonida.
   * Enum'ga yangi qiymat qo'shilsa, `QUESTION_COUNT`, barcha panel
   * filtrlari (`mode: "EXAM"`) va tayyorgarlik hisobi qayta ko'rilishi
   * kerak bo'lardi — bittasi unutilsa statistika jimgina noto'g'ri
   * bo'lib qolardi.
   *
   * Faqat PRACTICE uchun ishlaydi: imtihon savollari soni qat'iy
   * (`QUESTION_COUNT.EXAM`), aks holda o'quvchi 1 savollik "imtihon"
   * topshirib 100% olishi mumkin edi.
   */
  questionCount?: number;
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

  const targetCount = resolveQuestionCount(input.mode, input.questionCount);
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
      /** YHQ band raqami — izohning huquqiy asosi, masalan "YHQ 21-bobi 128-bandi". */
      legalReference: string | null;
    };

/**
 * Mashq rejimida javobni saqlaydi — va uni QAYTA YOZISHNI taqiqlaydi.
 *
 * Nega kerak: mashqda server javobdan keyin `correctOptionIndex` ni qaytaradi.
 * Klient tomonda variantlar shundan keyin bloklanadi (`practiceLocked`), lekin
 * server buni takrorlamas edi — API'ga to'g'ridan-to'g'ri ikkinchi so'rov
 * yuborish yetardi. Tekshirib ko'rilgan: xato javob → server to'g'risini
 * aytadi → o'shani qayta yuborish → ball 100%. Bu ballning o'zidan ko'ra
 * mavzu tahlilini buzardi (ustozning "zaif mavzular" ro'yxati).
 *
 * AYNI o'sha variant qayta kelsa xato qaytarilmaydi: `TestRunner` tarmoq
 * uzilganda javobni avtomatik qayta yuboradi, va birinchi so'rov aslida
 * yetib borgan bo'lsa (javob esa yo'qolgan bo'lsa) takroriy urinish
 * muvaffaqiyatsiz bo'lmasligi kerak.
 *
 * `create` + P2002 — poyga holatiga chidamli: bir vaqtda kelgan ikki so'rovdan
 * faqat bittasi yozadi, ikkinchisi shu yerda tekshiruvdan o'tadi.
 */
async function savePracticeAnswer(input: {
  attemptId: string;
  questionId: string;
  selectedOptionIndex: number;
  isCorrect: boolean;
}): Promise<void> {
  try {
    await prisma.attemptAnswer.create({
      data: {
        attemptId: input.attemptId,
        questionId: input.questionId,
        selectedOptionIndex: input.selectedOptionIndex,
        isCorrect: input.isCorrect,
      },
    });
  } catch (error) {
    const isDuplicate =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (!isDuplicate) throw error;

    const existing = await prisma.attemptAnswer.findUnique({
      where: {
        attemptId_questionId: {
          attemptId: input.attemptId,
          questionId: input.questionId,
        },
      },
      select: { selectedOptionIndex: true },
    });

    if (existing?.selectedOptionIndex !== input.selectedOptionIndex) {
      throw new AttemptError(
        "Mashq rejimida javob berilgandan keyin uni o'zgartirib bo'lmaydi",
        409
      );
    }
    // Aynan o'sha variant — bu takroriy so'rov, hech narsa o'zgartirilmaydi.
  }
}

export async function saveAnswer(input: {
  user: SessionUser;
  attemptId: string;
  questionId: string;
  selectedOptionIndex: number;
}): Promise<SaveAnswerResult> {
  // Yuqori chegara bu yerda tekshirilmaydi — u savolning O'ZIDAGI variantlar
  // soniga bog'liq (savollarda 2 tadan 5 tagacha variant bo'lishi mumkin),
  // shuning uchun savol o'qilgandan keyin, pastda tekshiriladi.
  if (!Number.isInteger(input.selectedOptionIndex) || input.selectedOptionIndex < 0) {
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
    select: {
      correctOptionIndex: true,
      explanation: true,
      legalReference: true,
      options: true,
    },
  });
  if (!question) throw new AttemptError("Savol topilmadi", 404);

  // Yuqori chegara — aynan shu savoldagi variantlar soni. Qattiq `> 3`
  // tekshiruvi 5 variantli savolda oxirgi ikkitasini rad etardi.
  if (input.selectedOptionIndex >= toStringArray(question.options).length) {
    throw new AttemptError("Noto'g'ri variant tanlandi");
  }

  const isCorrect = input.selectedOptionIndex === question.correctOptionIndex;

  if (attempt.mode === "PRACTICE") {
    await savePracticeAnswer({
      attemptId: input.attemptId,
      questionId: input.questionId,
      selectedOptionIndex: input.selectedOptionIndex,
      isCorrect,
    });
  } else {
    // IMTIHONDA javobni o'zgartirish QONUNIY: to'g'ri javob ko'rsatilmaydi,
    // o'quvchi esa yakunlashdan oldin fikrini o'zgartirishi tabiiy.
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
  }

  if (attempt.mode === "EXAM") {
    // Imtihon rejimida hech qanday feedback qaytarilmaydi.
    return { mode: "EXAM" };
  }

  return {
    mode: "PRACTICE",
    isCorrect,
    correctOptionIndex: question.correctOptionIndex,
    explanation: question.explanation,
    legalReference: question.legalReference,
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
  legalReference?: string | null;
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
          ? { correctOptionIndex: true, explanation: true, legalReference: true }
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
      | {
          correctOptionIndex?: number;
          explanation?: string | null;
          legalReference?: string | null;
        }
      | undefined;
    return {
      questionId: a.questionId,
      selectedOptionIndex: a.selectedOptionIndex,
      isCorrect: a.isCorrect,
      correctOptionIndex: question?.correctOptionIndex,
      explanation: question?.explanation ?? null,
      legalReference: question?.legalReference ?? null,
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
function computeScore(
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

export type TopicBreakdownRow = {
  topicId: string;
  topicName: string;
  correct: number;
  total: number;
};

/**
 * Savolning urinishdagi yakuniy holati.
 *
 * "Xato" va "javobsiz" ATAYLAB ajratilgan. Ball uchun ikkalasi ham bir xil
 * (javobsiz ham to'g'ri emas), lekin ustoz uchun bular butunlay boshqa
 * muammo: 18 tasiga noto'g'ri javob bergan o'quvchi bilimsiz, 18 tasiga
 * ulgurmagan o'quvchi esa sekin. Birinchisiga mavzuni qayta tushuntirish,
 * ikkinchisiga vaqtni boshqarishni o'rgatish kerak.
 */
export type ReviewQuestionStatus = "correct" | "wrong" | "unanswered";

export type ReviewQuestion = {
  questionId: string;
  /** Urinishdagi tartib raqami (1 dan) — test ekranidagi raqam bilan bir xil. */
  order: number;
  text: string;
  topicName: string;
  status: ReviewQuestionStatus;
  selectedOptionText: string | null;
  correctOptionText: string;
  explanation: string | null;
  /**
   * YHQ band raqami. Ustoz o'quvchi bilan bahslashganda ("nega bu javob
   * to'g'ri?") ko'rsatadigan huquqiy asos — B2B'da bu izohning o'zidan
   * kam ahamiyatli emas.
   */
  legalReference: string | null;
};

export type AttemptResult = {
  attemptId: string;
  mode: AttemptMode;
  score: number;
  correctCount: number;
  /** Javob berilgan, lekin noto'g'ri. */
  wrongCount: number;
  /** Umuman javob berilmagan (EXAM'da vaqt tugagach kelgan javoblar ham shu yerda). */
  unansweredCount: number;
  totalCount: number;
  /** PRACTICE uchun null — "o'tish/o'tmaslik" tushunchasi faqat EXAM'ga tegishli. */
  passed: boolean | null;
  /** O'tish uchun kerakli eng kam to'g'ri javoblar soni — faqat EXAM uchun. */
  passThreshold: number | null;
  topicBreakdown: TopicBreakdownRow[];
  /** BARCHA savollar, urinishdagi tartibda — xato ham, to'g'ri ham, javobsiz ham. */
  reviewQuestions: ReviewQuestion[];
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
        legalReference: true,
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

  // BARCHA savollar, urinishdagi tartibda. Sahifa shu ro'yxatdan ham
  // "faqat xatolar", ham "hammasi" ko'rinishini yasaydi — ikkinchi so'rov
  // kerak emas.
  const reviewQuestions: ReviewQuestion[] = attempt.questionIds
    .map((qid, index) => ({ question: questionById.get(qid), index }))
    .filter(
      (item): item is { question: NonNullable<typeof item.question>; index: number } =>
        item.question !== undefined
    )
    .map(({ question, index }) => {
      const options = toStringArray(question.options);
      const answer = answerByQuestionId.get(question.id);
      const status: ReviewQuestionStatus =
        answer === undefined ? "unanswered" : answer.isCorrect ? "correct" : "wrong";

      return {
        questionId: question.id,
        order: index + 1,
        text: question.text,
        topicName: question.topic.name,
        status,
        selectedOptionText:
          answer !== undefined ? (options[answer.selectedOptionIndex] ?? null) : null,
        correctOptionText: options[question.correctOptionIndex] ?? "",
        explanation: question.explanation,
        legalReference: question.legalReference,
      };
    });

  const totalCount = attempt.questionIds.length;
  const correctCount = savedAnswers.filter((a) => a.isCorrect).length;
  // Javob berilgan, lekin noto'g'ri — "javobsiz"dan alohida sanaladi.
  const wrongCount = savedAnswers.filter((a) => !a.isCorrect).length;
  // Qoldig'i sifatida hisoblanadi, `savedAnswers.length` ayirmasi emas:
  // urinishga tegishli bo'lmagan javob qatori bo'lib qolsa ham
  // to'g'ri + xato + javobsiz = jami ayniyati buzilmaydi. Natija ekranida
  // uchta raqam qo'shilib jamiga teng kelmasligi eng ko'zga tashlanadigan
  // xatolik bo'lardi (raqobatchida aynan shu xato bor: imtihonni to'xtatgan
  // uchinchi xato ularda "javobsiz" deb sanalib, sarlavhadagi "3 ta xato"
  // bilan zid chiqadi).
  const unansweredCount = Math.max(0, totalCount - correctCount - wrongCount);
  const score = attempt.score ?? 0;

  return {
    attemptId: input.attemptId,
    mode: attempt.mode,
    score,
    correctCount,
    wrongCount,
    unansweredCount,
    totalCount,
    // O'tish sharti: xato VA javobsizlar birgalikda ruxsat etilgan chegaradan
    // oshmasligi kerak — javobsiz qoldirish "xato emas" degani emas.
    passed:
      attempt.mode === "EXAM"
        ? totalCount - correctCount <= EXAM_MAX_WRONG
        : null,
    passThreshold: attempt.mode === "EXAM" ? totalCount - EXAM_MAX_WRONG : null,
    topicBreakdown: Array.from(topicMap.values()),
    reviewQuestions,
  };
}
