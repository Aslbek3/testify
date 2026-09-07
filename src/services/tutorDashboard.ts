import { prisma } from "@/lib/prisma";
import type { AttemptMode } from "@prisma/client";
import { readinessFromScore, type ReadinessStatus } from "@/lib/readiness";

export type TutorGroup = { id: string; name: string };

export type TopicErrorRate = {
  topicId: string;
  topicName: string;
  errorRatePercent: number;
};

export type MissedQuestion = {
  questionId: string;
  questionText: string;
  topicName: string;
  missPercent: number;
};

export type RosterEntry = {
  studentId: string;
  name: string;
  isActive: boolean;
  examAttemptCount: number;
  practiceAttemptCount: number;
  lastActivityAt: Date | null;
  averageScore: number | null;
  status: ReadinessStatus;
};

export type StudentGroupContext = {
  student: { userId: string; organizationId: string | null };
  group: { tutorId: string; organizationId: string };
};

export type StudentDetail = {
  name: string;
  masteryByTopic: { topicName: string; masteryPercent: number }[];
  attempts: { id: string; date: string; score: number | null; mode: AttemptMode }[];
};

/** Ustozga biriktirilgan guruhlar ro'yxati. */
export async function getGroupsForTutor(tutorId: string): Promise<TutorGroup[]> {
  return prisma.group.findMany({
    where: { tutorId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

async function getGroupStudentIds(groupId: string): Promise<string[]> {
  const profiles = await prisma.studentProfile.findMany({
    where: { groupId },
    select: { userId: true },
  });
  return profiles.map((p) => p.userId);
}

/** So'nggi `days` kun ichida guruhda boshlangan EXAM urinishlari soni. */
export async function getRecentExamAttemptCount(
  groupId: string,
  days = 7
): Promise<number> {
  const studentIds = await getGroupStudentIds(groupId);
  if (studentIds.length === 0) return 0;

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return prisma.attempt.count({
    where: { studentId: { in: studentIds }, mode: "EXAM", startedAt: { gte: since } },
  });
}

type GroupAnswer = {
  isCorrect: boolean;
  questionId: string;
  question: { text: string; topicId: string; topic: { name: string } };
};

/** Guruh o'quvchilarining barcha javoblari — xato foizi va ko'p xato qilingan savollar shu asosda hisoblanadi. */
async function getGroupAnswers(groupId: string): Promise<GroupAnswer[]> {
  const studentIds = await getGroupStudentIds(groupId);
  if (studentIds.length === 0) return [];
  return prisma.attemptAnswer.findMany({
    where: { attempt: { studentId: { in: studentIds } } },
    select: {
      isCorrect: true,
      questionId: true,
      question: {
        select: {
          text: true,
          topicId: true,
          topic: { select: { name: true } },
        },
      },
    },
  });
}

/** Mavzu bo'yicha xato foizi — javob berilmagan mavzular ro'yxatga kiritilmaydi. */
export async function getTopicErrorRates(groupId: string): Promise<TopicErrorRate[]> {
  const answers = await getGroupAnswers(groupId);

  const byTopic = new Map<string, { topicName: string; total: number; wrong: number }>();
  for (const a of answers) {
    const entry = byTopic.get(a.question.topicId) ?? {
      topicName: a.question.topic.name,
      total: 0,
      wrong: 0,
    };
    entry.total += 1;
    if (!a.isCorrect) entry.wrong += 1;
    byTopic.set(a.question.topicId, entry);
  }

  const rates: TopicErrorRate[] = Array.from(byTopic.entries()).map(([topicId, v]) => ({
    topicId,
    topicName: v.topicName,
    errorRatePercent: Math.round((v.wrong / v.total) * 100),
  }));

  rates.sort((a, b) => b.errorRatePercent - a.errorRatePercent);
  return rates;
}

/** Guruh bo'yicha eng ko'p xato qilingan savollar (kamida bitta javob bo'lgan savollar orasidan). */
export async function getMostMissedQuestions(
  groupId: string,
  limit = 5
): Promise<MissedQuestion[]> {
  const answers = await getGroupAnswers(groupId);

  const byQuestion = new Map<
    string,
    { questionText: string; topicName: string; total: number; wrong: number }
  >();
  for (const a of answers) {
    const entry = byQuestion.get(a.questionId) ?? {
      questionText: a.question.text,
      topicName: a.question.topic.name,
      total: 0,
      wrong: 0,
    };
    entry.total += 1;
    if (!a.isCorrect) entry.wrong += 1;
    byQuestion.set(a.questionId, entry);
  }

  const questions: MissedQuestion[] = Array.from(byQuestion.entries()).map(
    ([questionId, v]) => ({
      questionId,
      questionText: v.questionText,
      topicName: v.topicName,
      missPercent: Math.round((v.wrong / v.total) * 100),
    })
  );

  questions.sort((a, b) => b.missPercent - a.missPercent);
  return questions.slice(0, limit);
}

/**
 * Guruhdagi har bir o'quvchi bo'yicha urinishlar, o'rtacha ball va holat.
 * O'rtacha ball va holat FAQAT imtihon (EXAM) urinishlaridan hisoblanadi —
 * mashqda javob darhol ko'rsatilgani uchun mashq ballari sun'iy yuqori
 * bo'ladi va aralashtirilsa ustozga noto'g'ri manzara beradi. Oxirgi
 * faollik esa ikkala rejimni ham hisobga oladi (haqiqiy faollik ko'rsatkichi).
 */
export async function getRosterForGroup(groupId: string): Promise<RosterEntry[]> {
  const profiles = await prisma.studentProfile.findMany({
    where: { groupId },
    select: { userId: true, user: { select: { name: true, isActive: true } } },
  });
  if (profiles.length === 0) return [];

  const studentIds = profiles.map((p) => p.userId);
  const attempts = await prisma.attempt.findMany({
    where: { studentId: { in: studentIds } },
    orderBy: { startedAt: "desc" },
    select: { studentId: true, startedAt: true, finishedAt: true, score: true, mode: true },
  });

  const attemptsByStudent = new Map<string, typeof attempts>();
  for (const a of attempts) {
    const list = attemptsByStudent.get(a.studentId) ?? [];
    list.push(a);
    attemptsByStudent.set(a.studentId, list);
  }

  return profiles.map((p) => {
    const studentAttempts = attemptsByStudent.get(p.userId) ?? [];
    // Faqat YAKUNLANGAN urinishlar sanaladi — tashlab ketilgani (score null)
    // o'rtacha ballga ham kirmaydi, shuning uchun uni ustunda ko'rsatish
    // "5 imtihon · Imtihon topshirilmagan" kabi o'zaro zid qator hosil qilardi.
    const examAttempts = studentAttempts.filter(
      (a) => a.mode === "EXAM" && a.finishedAt !== null
    );
    const practiceAttempts = studentAttempts.filter(
      (a) => a.mode === "PRACTICE" && a.finishedAt !== null
    );
    const finishedExamScores = examAttempts
      .filter((a) => a.score !== null)
      .map((a) => a.score as number);
    const averageScore =
      finishedExamScores.length > 0
        ? Math.round(
            finishedExamScores.reduce((sum, s) => sum + s, 0) / finishedExamScores.length
          )
        : null;
    // Eng so'nggi faollik — barcha urinishlarning ham boshlanish, ham
    // yakunlanish vaqtlari ichidan eng kattasi. Faqat `[0]` ni olish
    // noto'g'ri edi: ro'yxat startedAt bo'yicha saralangani uchun keyinroq
    // yakunlangan eski urinish e'tibordan chetda qolib, ko'rsatilgan vaqt
    // orqaga siljib ketishi mumkin edi.
    const activityTimes = studentAttempts.flatMap((a) =>
      a.finishedAt ? [a.startedAt.getTime(), a.finishedAt.getTime()] : [a.startedAt.getTime()]
    );
    const lastActivityAt =
      activityTimes.length > 0 ? new Date(Math.max(...activityTimes)) : null;

    return {
      studentId: p.userId,
      name: p.user.name,
      isActive: p.user.isActive,
      examAttemptCount: examAttempts.length,
      practiceAttemptCount: practiceAttempts.length,
      lastActivityAt,
      averageScore,
      status: readinessFromScore(averageScore),
    };
  });
}

/**
 * O'quvchi va uning guruhi haqida ruxsat tekshiruvi (canViewStudent) uchun
 * yetarli minimal ma'lumot. O'quvchi topilmasa null qaytadi.
 */
export async function getStudentGroupContext(
  studentId: string
): Promise<StudentGroupContext | null> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
    select: {
      userId: true,
      user: { select: { organizationId: true } },
      group: { select: { tutorId: true, organizationId: true } },
    },
  });
  if (!profile) return null;

  return {
    student: { userId: profile.userId, organizationId: profile.user.organizationId },
    group: { tutorId: profile.group.tutorId, organizationId: profile.group.organizationId },
  };
}

/**
 * O'quvchining mavzular bo'yicha o'zlashtirishi (eng zaif mavzu birinchi)
 * va yakunlangan urinishlar tarixi.
 */
export async function getStudentDetailForTutor(
  studentId: string
): Promise<StudentDetail | null> {
  const user = await prisma.user.findUnique({
    where: { id: studentId },
    select: { name: true },
  });
  if (!user) return null;

  const topics = await prisma.topic.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const answers = await prisma.attemptAnswer.findMany({
    where: { attempt: { studentId } },
    select: { isCorrect: true, question: { select: { topicId: true } } },
  });

  const statsByTopic = new Map<string, { correct: number; total: number }>();
  for (const a of answers) {
    const entry = statsByTopic.get(a.question.topicId) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (a.isCorrect) entry.correct += 1;
    statsByTopic.set(a.question.topicId, entry);
  }

  // FAQAT o'quvchi tegib ko'rgan mavzular. Ilgari barcha mavzular olinib,
  // ma'lumot yo'qlari 0% deb belgilanardi va ro'yxat o'sish bo'yicha
  // saralangani uchun "hech urinilmagan" mavzular "eng zaif" bo'lib
  // ro'yxat boshini to'ldirib tashlardi — ustoz haqiqiy zaif mavzuni
  // ko'rmay qolardi. studentDashboard'dagi getMasteryByTopic ham aynan
  // shu qoidada ishlaydi.
  const masteryByTopic = topics
    .filter((t) => (statsByTopic.get(t.id)?.total ?? 0) > 0)
    .map((t) => {
      const stats = statsByTopic.get(t.id)!;
      return {
        topicName: t.name,
        masteryPercent: Math.round((stats.correct / stats.total) * 100),
      };
    })
    .sort((a, b) => a.masteryPercent - b.masteryPercent);

  const attemptRows = await prisma.attempt.findMany({
    where: { studentId, finishedAt: { not: null } },
    orderBy: { finishedAt: "desc" },
    select: { id: true, finishedAt: true, score: true, mode: true },
  });

  const attempts = attemptRows.map((a) => ({
    id: a.id,
    date: (a.finishedAt as Date).toISOString(),
    score: a.score,
    mode: a.mode,
  }));

  return { name: user.name, masteryByTopic, attempts };
}
