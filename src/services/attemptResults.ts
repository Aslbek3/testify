import type { AttemptMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canTakeAttempt } from "@/lib/permissions";
import { toStringArray } from "@/lib/json";
import { EXAM_DURATION_SECONDS, EXAM_MAX_WRONG } from "@/lib/examRules";
import type { SessionUser } from "@/types/auth";
import { AttemptError } from "@/services/attemptError";

/**
 * Yakunlangan urinishning NATIJASI — natija ekrani uchun.
 *
 * `attempts.ts` dan ajratilgan (2026-09-27). Bu yer faqat O'QIYDI:
 * ballni qayta hisoblamaydi, bazaga yozmaydi. Ballash `attemptScoring.ts`
 * da; ikkisi aralashganda "natijani ochish ballni o'zgartirib yubormaydimi"
 * degan savolga javob berish qiyin edi.
 */

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
