import { prisma } from "@/lib/prisma";
import { readinessFromScore, type ReadinessStatus } from "@/lib/readiness";

export class DirectorActionError extends Error {}

export type OrganizationOverview = {
  groupCount: number;
  tutorCount: number;
  studentCount: number;
  averageScore: number | null;
};

export type TutorRankingRow = {
  tutorId: string;
  tutorName: string;
  isActive: boolean;
  groupName: string;
  studentCount: number;
  averageScore: number | null;
};

export type GroupOverviewRow = {
  groupId: string;
  groupName: string;
  tutorName: string;
  studentCount: number;
  lastActivityAt: Date | null;
};

function average(scores: number[]): number | null {
  if (scores.length === 0) return null;
  const sum = scores.reduce((a, b) => a + b, 0);
  return Math.round(sum / scores.length);
}

export async function getOrganizationOverview(
  organizationId: string
): Promise<OrganizationOverview> {
  const [groupCount, tutorCount, studentCount, finishedAttempts] = await Promise.all([
    prisma.group.count({ where: { organizationId } }),
    prisma.user.count({ where: { organizationId, role: "TUTOR" } }),
    prisma.user.count({ where: { organizationId, role: "STUDENT" } }),
    prisma.attempt.findMany({
      where: {
        score: { not: null },
        student: {
          studentProfile: { group: { organizationId } },
        },
      },
      select: { score: true },
    }),
  ]);

  const scores = finishedAttempts
    .map((a) => a.score)
    .filter((s): s is number => s !== null);

  return {
    groupCount,
    tutorCount,
    studentCount,
    averageScore: average(scores),
  };
}

export async function getTutorRanking(
  organizationId: string
): Promise<TutorRankingRow[]> {
  const tutors = await prisma.user.findMany({
    where: { organizationId, role: "TUTOR" },
    select: {
      id: true,
      name: true,
      isActive: true,
      tutorOfGroups: {
        where: { organizationId },
        select: {
          name: true,
          students: {
            select: {
              user: {
                select: {
                  attempts: {
                    where: { score: { not: null } },
                    select: { score: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const rows: TutorRankingRow[] = tutors.map((tutor) => {
    const groupName = tutor.tutorOfGroups.map((g) => g.name).join(", ") || "—";
    const students = tutor.tutorOfGroups.flatMap((g) => g.students);
    const scores = students.flatMap((s) =>
      s.user.attempts
        .map((a) => a.score)
        .filter((sc): sc is number => sc !== null)
    );

    return {
      tutorId: tutor.id,
      tutorName: tutor.name,
      isActive: tutor.isActive,
      groupName,
      studentCount: students.length,
      averageScore: average(scores),
    };
  });

  rows.sort((a, b) => {
    if (a.averageScore === null && b.averageScore === null) return 0;
    if (a.averageScore === null) return 1;
    if (b.averageScore === null) return -1;
    return b.averageScore - a.averageScore;
  });

  return rows;
}

export async function getGroupsOverview(
  organizationId: string
): Promise<GroupOverviewRow[]> {
  const groups = await prisma.group.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      tutor: { select: { name: true } },
      students: {
        select: {
          user: {
            select: {
              attempts: {
                select: { startedAt: true },
                orderBy: { startedAt: "desc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  return groups.map((group) => {
    const activityDates = group.students.flatMap((s) =>
      s.user.attempts.map((a) => a.startedAt)
    );
    const lastActivityAt =
      activityDates.length > 0
        ? new Date(Math.max(...activityDates.map((d) => d.getTime())))
        : null;

    return {
      groupId: group.id,
      groupName: group.name,
      tutorName: group.tutor.name,
      studentCount: group.students.length,
      lastActivityAt,
    };
  });
}

/** "Yangi guruh" modalidagi ustoz tanlash ro'yxati uchun. */
export async function listTutorsForOrganization(
  organizationId: string
): Promise<{ id: string; name: string }[]> {
  return prisma.user.findMany({
    where: { organizationId, role: "TUTOR" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function createGroup(input: {
  name: string;
  tutorId: string;
  organizationId: string;
}) {
  const tutor = await prisma.user.findUnique({
    where: { id: input.tutorId },
    select: { role: true, organizationId: true },
  });
  if (!tutor || tutor.role !== "TUTOR" || tutor.organizationId !== input.organizationId) {
    throw new DirectorActionError(
      "Tanlangan ustoz shu tashkilotga tegishli emas yoki topilmadi"
    );
  }

  return prisma.group.create({
    data: {
      name: input.name,
      tutorId: input.tutorId,
      organizationId: input.organizationId,
    },
  });
}

/** Guruh filtri va "guruhni o'zgartirish"/"yangi o'quvchi" tanlash ro'yxatlari uchun. */
export async function listGroupsForOrganization(
  organizationId: string
): Promise<{ id: string; name: string }[]> {
  return prisma.group.findMany({
    where: { organizationId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export type OrganizationStudentRow = {
  studentId: string;
  name: string;
  isActive: boolean;
  groupId: string;
  groupName: string;
  tutorName: string;
  examAttemptCount: number;
  averageScore: number | null;
  status: ReadinessStatus;
};

export type ListStudentsParams = {
  q?: string;
  groupId?: string;
};

/**
 * Tashkilotdagi BARCHA o'quvchilar (guruhidan qat'iy nazar) — Direktor
 * paneli uchun. O'rtacha ball FAQAT imtihon (EXAM) urinishlaridan
 * hisoblanadi — tutorDashboard'dagi kabi sabab: mashqda javob darhol
 * ko'rsatiladi, shu bois mashq ballari sun'iy yuqori bo'ladi.
 */
export async function listStudentsForOrganization(
  organizationId: string,
  params: ListStudentsParams = {}
): Promise<OrganizationStudentRow[]> {
  const { q, groupId } = params;

  const students = await prisma.user.findMany({
    where: {
      organizationId,
      role: "STUDENT",
      ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
      ...(groupId ? { studentProfile: { groupId } } : {}),
    },
    select: {
      id: true,
      name: true,
      isActive: true,
      studentProfile: {
        select: {
          group: { select: { id: true, name: true, tutor: { select: { name: true } } } },
        },
      },
      attempts: {
        where: { mode: "EXAM" },
        select: { score: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return students
    .filter((s) => s.studentProfile !== null)
    .map((s) => {
      const examAttempts = s.attempts;
      const scores = examAttempts
        .map((a) => a.score)
        .filter((score): score is number => score !== null);
      const averageScore =
        scores.length > 0
          ? Math.round(scores.reduce((sum, sc) => sum + sc, 0) / scores.length)
          : null;

      return {
        studentId: s.id,
        name: s.name,
        isActive: s.isActive,
        groupId: s.studentProfile!.group.id,
        groupName: s.studentProfile!.group.name,
        tutorName: s.studentProfile!.group.tutor.name,
        examAttemptCount: examAttempts.length,
        averageScore,
        status: readinessFromScore(averageScore),
      };
    });
}
