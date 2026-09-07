import { prisma } from "@/lib/prisma";
import type { AttemptMode } from "@prisma/client";

export type StudentOverview = {
  overallScore: number | null;
  attemptCount: number;
  groupName: string | null;
};

export type TopicMastery = {
  topicId: string;
  topicName: string;
  masteryPercent: number;
};

export type AttemptHistoryItem = {
  id: string;
  date: Date;
  score: number | null;
  questionCount: number;
  mode: AttemptMode;
};

/**
 * O'quvchining o'z guruhi ID'si — test boshlanganda Attempt.groupId'ga
 * yozish uchun. Klient tomonidan yuborilgan groupId'ga ishonilmaydi,
 * har doim shu orqali serverda aniqlanadi.
 */
export async function getStudentGroupId(studentId: string): Promise<string | null> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
    select: { groupId: true },
  });
  return profile?.groupId ?? null;
}

/**
 * O'quvchining umumiy ko'rsatkichlari: tayyorgarlik foizi FAQAT imtihon
 * (EXAM) urinishlari bo'yicha hisoblanadi — mashqda javob darhol
 * ko'rsatilgani uchun mashq ballari sun'iy yuqori bo'ladi va aralashtirilsa
 * haqiqiy tayyorgarlikni noto'g'ri ko'rsatadi. Jami urinishlar soni esa
 * umumiy faollik ko'rsatkichi sifatida ikkala rejimni ham o'z ichiga oladi.
 */
export async function getStudentOverview(studentId: string): Promise<StudentOverview> {
  const [attempts, examAttempts, profile] = await Promise.all([
    prisma.attempt.findMany({
      where: { studentId },
      select: { score: true },
    }),
    prisma.attempt.findMany({
      where: { studentId, mode: "EXAM" },
      select: { score: true },
    }),
    prisma.studentProfile.findUnique({
      where: { userId: studentId },
      include: { group: { select: { name: true } } },
    }),
  ]);

  const finishedExamScores = examAttempts
    .map((a) => a.score)
    .filter((score): score is number => score !== null);

  const overallScore =
    finishedExamScores.length === 0
      ? null
      : Math.round(
          finishedExamScores.reduce((sum, s) => sum + s, 0) / finishedExamScores.length
        );

  return {
    overallScore,
    attemptCount: attempts.length,
    groupName: profile?.group.name ?? null,
  };
}

/**
 * Har bir mavzu bo'yicha o'quvchining o'zi javob bergan savollar orasidagi
 * to'g'ri javob foizi. O'quvchi umuman tegmagan mavzular chiqarib tashlanadi.
 */
export async function getMasteryByTopic(studentId: string): Promise<TopicMastery[]> {
  const answers = await prisma.attemptAnswer.findMany({
    where: { attempt: { studentId } },
    select: {
      isCorrect: true,
      question: { select: { topicId: true, topic: { select: { name: true } } } },
    },
  });

  const byTopic = new Map<string, { name: string; correct: number; total: number }>();

  for (const answer of answers) {
    const topicId = answer.question.topicId;
    const entry = byTopic.get(topicId) ?? {
      name: answer.question.topic.name,
      correct: 0,
      total: 0,
    };
    entry.total += 1;
    if (answer.isCorrect) entry.correct += 1;
    byTopic.set(topicId, entry);
  }

  const result: TopicMastery[] = Array.from(byTopic.entries()).map(([topicId, entry]) => ({
    topicId,
    topicName: entry.name,
    masteryPercent: Math.round((entry.correct / entry.total) * 100),
  }));

  result.sort((a, b) => a.masteryPercent - b.masteryPercent);

  return result;
}

/**
 * O'quvchining barcha urinishlari, eng so'nggisidan boshlab.
 * Tugallanmagan urinishlarda score null bo'ladi.
 */
export async function getAttemptHistory(studentId: string): Promise<AttemptHistoryItem[]> {
  const attempts = await prisma.attempt.findMany({
    where: { studentId },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      startedAt: true,
      score: true,
      mode: true,
      questionIds: true,
    },
  });

  return attempts.map((attempt) => ({
    id: attempt.id,
    date: attempt.startedAt,
    score: attempt.score,
    // Urinishdagi SAVOLLAR soni — berilgan javoblar soni emas. Ball ham
    // aynan questionIds.length'dan hisoblanadi (javobsiz qolgan savol xato
    // deb sanaladi), shuning uchun javoblar sonini ko'rsatish jadvalda
    // "12 savol / 50%" kabi o'zaro zid qatorlar hosil qilardi.
    questionCount: attempt.questionIds.length,
    mode: attempt.mode,
  }));
}
