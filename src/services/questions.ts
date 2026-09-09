import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toStringArray } from "@/lib/json";
import { MIN_OPTIONS, MAX_OPTIONS, optionLetter } from "@/lib/questionOptions";

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
  explanation: string | null;
  legalReference: string | null;
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
    explanation: question.explanation,
    legalReference: question.legalReference,
  }));
}

/**
 * Bo'sh string'ni `null` ga aylantiradi — ixtiyoriy matn maydonlari (rasm
 * tavsifi, YHQ havolasi) bazada "" bo'lib yotmasin, "yo'q" degani har doim
 * bitta ko'rinishda (`null`) saqlansin.
 */
function normalizeOptionalText(value: string | null | undefined): string | null {
  return value?.trim() || null;
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
  if (
    input.options.length < MIN_OPTIONS ||
    input.options.length > MAX_OPTIONS
  ) {
    throw new QuestionBankError(
      `Savolda ${MIN_OPTIONS} tadan ${MAX_OPTIONS} tagacha variant bo'lishi kerak ` +
        `(hozir ${input.options.length} ta)`
    );
  }
  const emptyIndex = input.options.findIndex((option) => !option.trim());
  if (emptyIndex !== -1) {
    throw new QuestionBankError(
      `${optionLetter(emptyIndex)} varianti bo'sh — barcha variantlar to'ldirilishi shart`
    );
  }
  // Chegara variantlar soniga bog'liq: 3 ta variantli savolda "D" javob
  // bo'lishi mumkin emas.
  if (
    !Number.isInteger(input.correctOptionIndex) ||
    input.correctOptionIndex < 0 ||
    input.correctOptionIndex >= input.options.length
  ) {
    throw new QuestionBankError(
      `To'g'ri javob A–${optionLetter(input.options.length - 1)} variantlardan biri bo'lishi kerak`
    );
  }
}

export async function createQuestion(input: {
  topicId: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  imageAlt?: string | null;
  explanation?: string | null;
  legalReference?: string | null;
}) {
  validateQuestionInput(input);

  return prisma.question.create({
    data: {
      topicId: input.topicId,
      text: input.text.trim(),
      options: input.options.map((option) => option.trim()),
      correctOptionIndex: input.correctOptionIndex,
      imageAlt: normalizeOptionalText(input.imageAlt),
      explanation: normalizeOptionalText(input.explanation),
      legalReference: normalizeOptionalText(input.legalReference),
    },
  });
}

/**
 * Savolga allaqachon javob berilgan bo'lsa, bahoni belgilaydigan qismlar
 * (to'g'ri javob indeksi va variantlar ro'yxati) MUZLATILADI.
 *
 * Sabab: `AttemptAnswer.isCorrect` javob berilgan paytda hisoblanib
 * saqlanadi, natija sahifasi esa "to'g'ri javob" matnini savolning
 * HOZIRGI holatidan oladi. Ular ajralib ketsa, eski natijada o'quvchining
 * tanlagan varianti bilan "to'g'ri javob" bir xil matn bo'lib turadi-yu,
 * savol baribir "Xato qilingan savollar" ro'yxatida qoladi; saqlangan ball
 * ham qayta hisoblanmagani uchun ball bilan tafsilot bir-biriga zid bo'ladi.
 *
 * Matn, izoh, YHQ havolasi va rasm tavsifini o'zgartirish esa har doim ochiq —
 * ular baholashga ta'sir qilmaydi, imlo xatosini tuzatish yoki qonun bandini
 * keyinroq qo'shish bloklanmasligi kerak.
 */
function isGradingChanged(
  existing: { options: string[]; correctOptionIndex: number },
  incoming: { options: string[]; correctOptionIndex: number }
): boolean {
  if (existing.correctOptionIndex !== incoming.correctOptionIndex) return true;
  if (existing.options.length !== incoming.options.length) return true;
  // Tartib muhim: variantlar o'rni almashsa ham saqlangan
  // `selectedOptionIndex` boshqa matnga ishora qilib qoladi.
  return existing.options.some(
    (option, index) => option.trim() !== incoming.options[index].trim()
  );
}

export async function updateQuestion(
  id: string,
  input: {
    text: string;
    options: string[];
    correctOptionIndex: number;
    imageAlt?: string | null;
    explanation?: string | null;
    legalReference?: string | null;
  }
) {
  validateQuestionInput(input);

  const existing = await prisma.question.findUnique({
    where: { id },
    select: { options: true, correctOptionIndex: true },
  });
  if (!existing) {
    throw new QuestionBankError("Savol topilmadi");
  }

  const answerCount = await prisma.attemptAnswer.count({
    where: { questionId: id },
  });

  if (
    answerCount > 0 &&
    isGradingChanged(
      {
        options: toStringArray(existing.options),
        correctOptionIndex: existing.correctOptionIndex,
      },
      { options: input.options, correctOptionIndex: input.correctOptionIndex }
    )
  ) {
    throw new QuestionBankError(
      "Bu savolga allaqachon javob berilgan — to'g'ri javobni yoki variantlarni " +
        "o'zgartirib bo'lmaydi, chunki eski natijalar buziladi. Yangi savol yarating."
    );
  }

  return prisma.question.update({
    where: { id },
    data: {
      text: input.text.trim(),
      options: input.options.map((option) => option.trim()),
      correctOptionIndex: input.correctOptionIndex,
      imageAlt: normalizeOptionalText(input.imageAlt),
      explanation: normalizeOptionalText(input.explanation),
      legalReference: normalizeOptionalText(input.legalReference),
    },
  });
}

/**
 * Savol sifati statistikasi reytingga kirishi uchun kerak bo'lgan eng kam
 * javoblar soni.
 *
 * `services/tutorDashboard.ts` dagi `MIN_ANSWERS_FOR_RANKING` bilan bir xil
 * g'oya va bir xil qiymat, lekin ATAYLAB alohida konstanta: u guruh ichidagi
 * reyting uchun, bu esa butun platforma bo'yicha kontent sifati uchun —
 * ikkalasi bir-biridan mustaqil sozlanishi kerak (platformada javoblar
 * ko'proq bo'lgani sababli bu chegara kelajakda oshirilishi mumkin).
 *
 * Sababi o'sha: bir marta berilib bir marta xato qilingan savol 100%
 * ko'rsatib, haqiqatan muammoli (masalan 40 javobdan 34 tasi xato)
 * savolni ro'yxatdan siqib chiqaradi.
 */
export const MIN_ANSWERS_FOR_QUALITY = 5;

/**
 * Shu foizdan yuqori xato — savolning O'ZIDA muammo bor degan signal.
 *
 * 80 raqami tavakkal javob berish ehtimolidan kelib chiqadi: 4 variantli
 * savolda hech narsa bilmay tanlagan o'quvchi ham o'rtacha 75% xato
 * qiladi. Ya'ni 75% atrofidagi ko'rsatkich "savol qiyin" degani, undan
 * yuqorisi esa tasodif bilan izohlanmaydi — o'quvchilar bilib turib
 * bitta noto'g'ri variantni tanlashyapti, bu esa odatda ikki ma'noli
 * matn, noto'g'ri belgilangan to'g'ri javob yoki chalkash variantlar
 * belgisi.
 */
export const SUSPICIOUS_WRONG_PERCENT = 80;

export type QuestionQualityStat = {
  questionId: string;
  questionText: string;
  topicId: string;
  topicName: string;
  /** Nechta javob asosida hisoblangan (javobsiz qoldirilganlar sanalmaydi). */
  answerCount: number;
  wrongPercent: number;
  /** `answerCount >= MIN_ANSWERS_FOR_QUALITY` — xulosa chiqarsa bo'ladimi. */
  hasEnoughData: boolean;
  /** Yetarli ma'lumot bor VA xato foizi shubhali darajada yuqori. */
  needsReview: boolean;
};

type QualityRow = {
  questionId: string;
  questionText: string;
  topicId: string;
  topicName: string;
  answerCount: number;
  wrongCount: number;
};

/**
 * Savol sifati statistikasining yagona so'rovi.
 *
 * Agregatsiya to'liq BAZADA bajariladi (`GROUP BY` + `FILTER`) — savol
 * boshiga bitta qator qaytadi. Butun platformaning `AttemptAnswer`
 * jadvalini Node'ga tortish mumkin emas edi: bu jadval o'sish jihatidan
 * eng katta jadval (har imtihonda o'quvchi boshiga ~20 qator).
 * Prisma'ning `groupBy`i bog'langan jadval ustuni (`question.topicId`)
 * bo'yicha guruhlay olmagani va `FILTER` ni bilmagani uchun `$queryRaw`.
 *
 * ⚠️ Faqat MODE = 'EXAM' va yakunlangan urinishlar hisobga olinadi.
 * Ikkita sabab:
 *  1. Mashq (PRACTICE) rejimida javob darhol ko'rsatiladi — o'sha savol
 *     qayta chiqqanda o'quvchi javobni ESLAB qoladi, savolni tushungani
 *     uchun emas. Mashq javoblarini qo'shsak, ko'p uchraydigan savolning
 *     xato foizi sun'iy ravishda pasayadi va aynan eng ko'p ishlatiladigan
 *     (ya'ni eng muhim) savollar ro'yxatdan tushib qoladi.
 *  2. Yakunlanmagan urinish — ochib qo'yib tashlab ketilgan imtihon;
 *     u yerdagi tasodifiy bosilgan javoblar sifat signalini buzadi.
 * Xuddi shu shart ustoz panelidagi "eng ko'p xato qilingan savollar"da
 * ham bor, shuning uchun owner va ustoz bir savol uchun bir xil raqam
 * ko'radi.
 *
 * Javobsiz qolgan savollar (`Attempt.questionIds` da bor, lekin
 * `AttemptAnswer` da yo'q) ATAYLAB sanalmaydi — aks holda ro'yxat savol
 * sifatini emas, savolning imtihondagi o'rnini ko'rsatadi: vaqt
 * tugaganda har doim oxirgi savollar javobsiz qoladi.
 */
async function queryQuestionQuality(options: {
  topicId?: string;
  minAnswers: number;
  limit?: number;
}): Promise<QuestionQualityStat[]> {
  const { topicId, minAnswers, limit } = options;

  const topicFilter = topicId
    ? Prisma.sql`AND q."topicId" = ${topicId}`
    : Prisma.empty;
  const limitClause = limit ? Prisma.sql`LIMIT ${limit}` : Prisma.empty;

  const rows = await prisma.$queryRaw<QualityRow[]>`
    SELECT
      q."id"   AS "questionId",
      q."text" AS "questionText",
      t."id"   AS "topicId",
      t."name" AS "topicName",
      COUNT(*)::int                                   AS "answerCount",
      COUNT(*) FILTER (WHERE NOT aa."isCorrect")::int AS "wrongCount"
    FROM "AttemptAnswer" aa
    JOIN "Attempt"  a ON a."id" = aa."attemptId"
    JOIN "Question" q ON q."id" = aa."questionId"
    JOIN "Topic"    t ON t."id" = q."topicId"
    WHERE a."mode" = 'EXAM'
      AND a."finishedAt" IS NOT NULL
      ${topicFilter}
    GROUP BY q."id", q."text", t."id", t."name"
    HAVING COUNT(*) >= ${minAnswers}::int
    -- Foiz teng bo'lganda ko'proq javob to'plangani ustun turadi: u
    -- ishonchliroq ma'lumot.
    ORDER BY
      (COUNT(*) FILTER (WHERE NOT aa."isCorrect"))::numeric / COUNT(*) DESC,
      COUNT(*) DESC
    ${limitClause}
  `;

  return rows.map((row) => {
    const wrongPercent = Math.round((row.wrongCount / row.answerCount) * 100);
    const hasEnoughData = row.answerCount >= MIN_ANSWERS_FOR_QUALITY;
    return {
      questionId: row.questionId,
      questionText: row.questionText,
      topicId: row.topicId,
      topicName: row.topicName,
      answerCount: row.answerCount,
      wrongPercent,
      hasEnoughData,
      // "Tekshirish kerak" belgisi faqat yetarli ma'lumotda qo'yiladi —
      // 5 tadan kam javobga asoslanib owner'ni yaxshi savolni qayta
      // yozishga yuborish, statistika umuman bo'lmaganidan ham yomon.
      needsReview: hasEnoughData && wrongPercent >= SUSPICIOUS_WRONG_PERCENT,
    };
  });
}

/**
 * Butun platforma bo'yicha eng yuqori xato foizli savollar — owner uchun
 * kontent sifati ro'yxati.
 */
export function listLowQualityQuestions(limit = 10): Promise<QuestionQualityStat[]> {
  return queryQuestionQuality({ minAnswers: MIN_ANSWERS_FOR_QUALITY, limit });
}

/**
 * Bitta mavzu savollarining xato foizi, savol ID'si bo'yicha to'plam.
 *
 * Savollar jadvalidagi ustun uchun — shuning uchun `minAnswers: 1`:
 * jadvalda "kam ma'lumot" ham foydali ma'lumot (`hasEnoughData: false`
 * bilan belgilanadi, UI uni so'nik ko'rsatadi). Umuman javob berilmagan
 * savol qatorda bo'lmaydi va UI'da "—" bo'lib qoladi.
 *
 * Bu mavzu sahifasiga qo'shimcha bitta so'rov — savollar ro'yxati bilan
 * `Promise.all` ichida parallel ketadi va faqat shu mavzu bo'yicha
 * guruhlaydi (`topicId` filtri indeksli `Question.topicId` ustunida).
 */
export async function getQuestionQualityForTopic(
  topicId: string
): Promise<Record<string, QuestionQualityStat>> {
  const rows = await queryQuestionQuality({ topicId, minAnswers: 1 });

  const byQuestionId: Record<string, QuestionQualityStat> = {};
  for (const row of rows) {
    byQuestionId[row.questionId] = row;
  }
  return byQuestionId;
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
