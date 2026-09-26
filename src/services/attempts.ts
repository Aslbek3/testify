import { Prisma, type AttemptMode, type AttemptSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canTakeAttempt } from "@/lib/permissions";
import { toStringArray } from "@/lib/json";
import type { SessionUser } from "@/types/auth";
import { getStudentAccessForUser } from "@/services/studentPayments";
// Ballash ajratilgan faylda; `saveAnswer` imtihonni to'xtatganda va
// `getAttemptForResume` tashlab ketilganlarni yopganda kerak bo'ladi.
import {
  closeAttemptNow,
  finalizeExpiredAttempts,
} from "@/services/attemptScoring";

// Domen xatosi alohida faylda — uchala fayl ham undan foydalanadi
// (aylanma import bo'lmasligi uchun).
export { AttemptError } from "@/services/attemptError";
import { AttemptError } from "@/services/attemptError";

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
  /**
   * Vazifa orqali boshlanganda — `services/assignments.ts` dagi
   * `startAssignmentAttempt` beradi (u egalik va muddatni o'zi tekshiradi).
   * `/api/attempts` bu maydonni tanadan ATAYLAB o'qimaydi: aks holda
   * o'quvchi istalgan mashqini begona vazifaga "bajarildi" deb yozdira olardi.
   */
  assignmentId?: string;
  /**
   * Urinish qayerdan boshlangani — faqat yorliq va "Xatolarim" filtri uchun.
   * Qoidalarni `mode` boshqaraveradi (`schema.prisma`, `AttemptSource`).
   */
  source?: AttemptSource;
  /**
   * Savollar ro'yxati oldindan ma'lum bo'lsa (xatolar ustida ishlash,
   * bilet) — tanlov shu ro'yxat ichidan qilinadi. `topicIds` dan ustun
   * turadi.
   */
  questionIds?: string[];
  /**
   * Berilgan tartibni saqlash — bilet uchun: rasmiy biletda savollar
   * har doim bir xil ketma-ketlikda turadi va o'quvchi shunga o'rganadi.
   * Standart holatda savollar aralashtiriladi.
   */
  keepOrder?: boolean;
}): Promise<{
  attemptId: string;
  mode: AttemptMode;
  questions: AttemptQuestionForClient[];
}> {
  if (input.user.role !== "STUDENT") {
    throw new AttemptError("Faqat o'quvchilar test boshlashi mumkin", 403);
  }

  // To'lov muddati (imtiyoz kunlari bilan) o'tgan o'quvchi yangi test
  // boshlay olmaydi. Tekshiruv SHU YERDA — sahifada emas: sahifadagi
  // cheklovni API'ga to'g'ridan-to'g'ri so'rov yuborib chetlab o'tish
  // mumkin edi.
  //
  // Faqat BOSHLASH yopiladi, allaqachon boshlangan testga javob berish
  // emas: muddat imtihon o'rtasida tugasa, o'quvchi uni oxiriga yetkaza
  // oladi — yarim yo'lda uzib qo'yish natijani ham, o'quvchini ham
  // behuda kuydirardi.
  const access = await getStudentAccessForUser(input.user.id);
  if (access.kind === "blocked") {
    throw new AttemptError(
      "To'lov muddati tugagan. Testlarni davom ettirish uchun to'lovni amalga oshiring.",
      402
    );
  }

  const where =
    input.questionIds && input.questionIds.length > 0
      ? { id: { in: input.questionIds } }
      : input.topicIds && input.topicIds.length > 0
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

  const selectedIds = input.keepOrder
    ? // Tartib chaqiruvchida belgilangan: bazadan kelgan qatorlarni emas,
      // berilgan ro'yxatning o'zini asos qilamiz.
      (input.questionIds ?? [])
        .filter((id) => candidates.some((c) => c.id === id))
        .slice(0, targetCount)
    : shuffle(candidates)
        .slice(0, Math.min(targetCount, candidates.length))
        .map((c) => c.id);

  const attempt = await prisma.attempt.create({
    data: {
      studentId: input.user.id,
      mode: input.mode,
      groupId: input.groupId ?? null,
      questionIds: selectedIds,
      assignmentId: input.assignmentId ?? null,
      source: input.source ?? null,
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
  | {
      mode: "EXAM";
      /**
       * Imtihon SHU javobdan keyin avtomatik yakunlandi: xatolar soni
       * `EXAM_MAX_WRONG` dan oshib ketdi.
       *
       * Faqat shu holatda qaytariladi — normal javobda maydon umuman
       * bo'lmaydi, ya'ni javobning to'g'ri-noto'g'riligi baribir
       * oshkor qilinmaydi.
       */
      stoppedByMistakes: true;
      /** Nechta xato bo'lgani — to'xtash ekranida ko'rsatiladi. */
      wrongCount: number;
    }
  | { mode: "EXAM"; stoppedByMistakes?: undefined }
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
    // HAQIQIY imtihon qoidasi: ruxsat etilganidan ko'p xato qilingan
    // lahzada imtihon to'xtaydi. Ilgari `EXAM_MAX_WRONG` faqat O'TISH
    // BALLINI hisoblashda ishlatilardi, imtihonning o'zi esa 20 ta
    // savolning oxirigacha davom etaverardi — ya'ni mashq bilan
    // imtihonning farqi faqat taymer edi.
    //
    // Xatolar HOZIRGI javoblardan sanaladi (saqlanganlar emas): imtihonda
    // javobni o'zgartirish mumkin, xato javobni to'g'rilagan o'quvchining
    // hisobi kamayishi kerak.
    //
    // Bu to'g'ri javobni oshkor qilmaydi: o'quvchi faqat imtihon
    // tugaganini biladi, qaysi savol xato bo'lganini natija ekrani
    // ko'rsatadi — u allaqachon hamma narsani ko'rsatadigan joy.
    const wrongCount = await prisma.attemptAnswer.count({
      where: {
        attemptId: input.attemptId,
        questionId: { in: attempt.questionIds },
        isCorrect: false,
      },
    });

    if (wrongCount > EXAM_MAX_WRONG) {
      await closeAttemptNow({
        id: input.attemptId,
        mode: attempt.mode,
        startedAt: attempt.startedAt,
        questionIds: attempt.questionIds,
      });
      return { mode: "EXAM", stoppedByMistakes: true, wrongCount };
    }

    // Aks holda hech qanday feedback qaytarilmaydi.
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
 * Ballash va natija AJRATILGAN fayllarda (2026-09-27), lekin ular shu
 * yerdan qayta eksport qilinadi: `attempts.ts` — modulning ommaviy
 * kirish nuqtasi va uni 17 ta fayl import qiladi. Qayta eksport bo'lmasa,
 * bo'lish har bir chaqiruvchini tahrirlashni talab qilardi va bu
 * refaktoringni mazmunli o'zgarishdan ajratib bo'lmas edi.
 */
export {
  finishAttempt,
  finalizeExpiredAttempts,
} from "@/services/attemptScoring";

export {
  getAttemptResult,
  type TopicBreakdownRow,
  type ReviewQuestion,
  type ReviewQuestionStatus,
  type AttemptResult,
} from "@/services/attemptResults";
