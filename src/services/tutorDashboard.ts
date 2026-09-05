import { prisma } from "@/lib/prisma";
import type { BadgeVariant } from "@/components/Badge";

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

export type RosterStatus = { label: string; variant: BadgeVariant };

export type RosterEntry = {
  studentId: string;
  name: string;
  attemptCount: number;
  lastActivityAt: Date | null;
  averageScore: number | null;
  status: RosterStatus;
};

export type StudentGroupContext = {
  student: { userId: string; organizationId: string | null };
  group: { tutorId: string; organizationId: string };
};

export type StudentDetail = {
  name: string;
  masteryByTopic: { topicName: string; masteryPercent: number }[];
  attempts: { id: string; date: string; score: number | null }[];
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

function statusFromScore(averageScore: number | null): RosterStatus {
  if (averageScore === null) return { label: "Hali boshlamagan", variant: "neutral" };
  if (averageScore >= 85) return { label: "Tayyor", variant: "success" };
  if (averageScore >= 65) return { label: "Deyarli tayyor", variant: "warning" };
  return { label: "Yordam kerak", variant: "danger" };
}

/** Guruhdagi har bir o'quvchi bo'yicha urinishlar, o'rtacha ball va holat. */
export async function getRosterForGroup(groupId: string): Promise<RosterEntry[]> {
  const profiles = await prisma.studentProfile.findMany({
    where: { groupId },
    select: { userId: true, user: { select: { name: true } } },
  });
  if (profiles.length === 0) return [];

  const studentIds = profiles.map((p) => p.userId);
  const attempts = await prisma.attempt.findMany({
    where: { studentId: { in: studentIds } },
    orderBy: { startedAt: "desc" },
    select: { studentId: true, startedAt: true, finishedAt: true, score: true },
  });

  const attemptsByStudent = new Map<string, typeof attempts>();
  for (const a of attempts) {
    const list = attemptsByStudent.get(a.studentId) ?? [];
    list.push(a);
    attemptsByStudent.set(a.studentId, list);
  }

  return profiles.map((p) => {
    const studentAttempts = attemptsByStudent.get(p.userId) ?? [];
    const finishedScores = studentAttempts
      .filter((a) => a.score !== null)
      .map((a) => a.score as number);
    const averageScore =
      finishedScores.length > 0
        ? Math.round(finishedScores.reduce((sum, s) => sum + s, 0) / finishedScores.length)
        : null;
    const lastActivityAt =
      studentAttempts.length > 0
        ? studentAttempts[0].finishedAt ?? studentAttempts[0].startedAt
        : null;

    return {
      studentId: p.userId,
      name: p.user.name,
      attemptCount: studentAttempts.length,
      lastActivityAt,
      averageScore,
      status: statusFromScore(averageScore),
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

  const masteryByTopic = topics
    .map((t) => {
      const stats = statsByTopic.get(t.id);
      const masteryPercent =
        stats && stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      return { topicName: t.name, masteryPercent };
    })
    .sort((a, b) => a.masteryPercent - b.masteryPercent);

  const attemptRows = await prisma.attempt.findMany({
    where: { studentId, finishedAt: { not: null } },
    orderBy: { finishedAt: "desc" },
    select: { id: true, finishedAt: true, score: true },
  });

  const attempts = attemptRows.map((a) => ({
    id: a.id,
    date: (a.finishedAt as Date).toISOString(),
    score: a.score,
  }));

  return { name: user.name, masteryByTopic, attempts };
}
