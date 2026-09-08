import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { readinessFromScore, type ReadinessStatus } from "@/lib/readiness";

export class DirectorActionError extends Error {}

export type OrganizationOverview = {
  groupCount: number;
  tutorCount: number;
  studentCount: number;
  /** Shundan nechtasining hisobi bloklangan — plitka ostidagi izoh uchun. */
  blockedStudentCount: number;
  averageScore: number | null;
};

export type TutorRankingRow = {
  tutorId: string;
  tutorName: string;
  isActive: boolean;
  groupName: string;
  /** Guruhning HOZIRGI a'zolari. */
  studentCount: number;
  /**
   * `averageScore` nechta o'quvchining imtihon natijasidan chiqqani. Bu
   * `studentCount` bilan teng bo'lishi SHART EMAS: ball urinish topshirilgan
   * paytdagi guruh (`Attempt.groupId`) bo'yicha hisoblanadi, ya'ni boshqa
   * guruhga ko'chirilgan o'quvchining eski natijasi eski ustozda qoladi.
   * Ikkala son yonma-yon ko'rsatiladi, aks holda "O'quvchilar: 0, O'rtacha
   * ball: 72%" qatori tushunarsiz bo'lib qoladi.
   */
  scoredStudentCount: number;
  averageScore: number | null;
};

export type GroupOverviewRow = {
  groupId: string;
  groupName: string;
  tutorName: string;
  studentCount: number;
  lastActivityAt: Date | null;
};

/**
 * O'quvchini sanashning YAGONA ta'rifi — direktor panelidagi barcha joyda
 * shu ishlatiladi (plitka, bo'sh holat tekshiruvi, ro'yxat). Guruh profili
 * yo'q STUDENT qatori hech qaysi guruhga tegishli emas va jadvalda
 * ko'rsatib ham bo'lmaydi, shuning uchun sanoqqa ham kirmaydi: aks holda
 * plitka "50", ro'yxat esa "48" ko'rsatardi.
 */
function studentScope(organizationId: string): Prisma.UserWhereInput {
  return { organizationId, role: "STUDENT", studentProfile: { isNot: null } };
}

/**
 * Tashkilotning o'rtacha bali.
 *
 * Uch narsa ataylab shunday:
 * 1. FAQAT `mode = 'EXAM'` va `finishedAt IS NOT NULL` — mashqda javob darhol
 *    ko'rsatiladi (ball sun'iy yuqori), tashlab ketilgan urinishning javobsiz
 *    savollari esa hali "xato" emas. `score IS NOT NULL` yolg'iz o'zi yetarli
 *    emas edi: u ikki maydon doim birga yozilishiga tayanadigan mo'rt shart.
 * 2. Avval HAR BIR O'QUVCHINING o'rtachasi, keyin o'quvchilar o'rtachasi
 *    (`GROUP BY a."studentId"` + tashqi `AVG`). Barcha urinishlarni bitta
 *    ro'yxatga qo'shib o'rtachalash noto'g'ri: 10 ta imtihonni 50% ga
 *    topshirgan o'quvchi va 1 ta imtihonni 100% ga topshirgan o'quvchida
 *    urinish bo'yicha 55%, o'quvchi bo'yicha esa 75% chiqadi. Pastdagi
 *    ustozlar reytingi aynan shu — o'quvchi bo'yicha — usulda hisoblaydi,
 *    ya'ni endi bitta sahifada bir-biriga zid ikkita raqam chiqmaydi.
 * 3. Bog'lanish `Attempt.groupId → Group.organizationId` orqali, o'quvchining
 *    HOZIRGI guruhi orqali emas — `getTutorRanking` bilan bir xil qoida.
 *
 * Agregatsiya bazada bajariladi: aks holda 500 o'quvchi × 50 imtihon = 25 000
 * qator faqat bitta o'rtacha uchun Node'ga tortilardi.
 */
async function getOrganizationAverageScore(
  organizationId: string
): Promise<number | null> {
  const rows = await prisma.$queryRaw<{ averageScore: number | null }[]>`
    SELECT ROUND(AVG(s."studentAvg"))::int AS "averageScore"
    FROM (
      SELECT ROUND(AVG(a."score")) AS "studentAvg"
      FROM "Attempt" a
      JOIN "Group" g ON g."id" = a."groupId"
      WHERE a."mode" = 'EXAM'
        AND a."finishedAt" IS NOT NULL
        AND a."score" IS NOT NULL
        AND g."organizationId" = ${organizationId}
      GROUP BY a."studentId"
    ) s
  `;

  return rows[0]?.averageScore ?? null;
}

export async function getOrganizationOverview(
  organizationId: string
): Promise<OrganizationOverview> {
  const [groupCount, tutorCount, studentCount, blockedStudentCount, averageScore] =
    await Promise.all([
      prisma.group.count({ where: { organizationId } }),
      prisma.user.count({ where: { organizationId, role: "TUTOR" } }),
      prisma.user.count({ where: studentScope(organizationId) }),
      prisma.user.count({
        where: { ...studentScope(organizationId), isActive: false },
      }),
      getOrganizationAverageScore(organizationId),
    ]);

  return {
    groupCount,
    tutorCount,
    studentCount,
    blockedStudentCount,
    averageScore,
  };
}

/**
 * Ustoz kesimidagi o'rtacha ball — `getOrganizationAverageScore` bilan
 * AYNI qoida (EXAM + yakunlangan + `Attempt.groupId` orqali bog'lanish +
 * avval o'quvchi o'rtachasi), faqat ustoz bo'yicha guruhlangan holda.
 *
 * `GROUP BY g."tutorId", a."studentId"` — bir o'quvchi shu ustozning ikki
 * guruhida bo'lgan bo'lsa ham u bitta o'quvchi sifatida sanaladi.
 * `scoredStudentCount` — ball nechta o'quvchining natijasidan chiqqani.
 */
async function getTutorScoreRows(organizationId: string) {
  return prisma.$queryRaw<
    { tutorId: string; averageScore: number; scoredStudentCount: number }[]
  >`
    SELECT
      sa."tutorId",
      ROUND(AVG(sa."studentAvg"))::int AS "averageScore",
      COUNT(*)::int                    AS "scoredStudentCount"
    FROM (
      SELECT g."tutorId"   AS "tutorId",
             a."studentId" AS "studentId",
             ROUND(AVG(a."score")) AS "studentAvg"
      FROM "Attempt" a
      JOIN "Group" g ON g."id" = a."groupId"
      WHERE a."mode" = 'EXAM'
        AND a."finishedAt" IS NOT NULL
        AND a."score" IS NOT NULL
        AND g."organizationId" = ${organizationId}
      GROUP BY g."tutorId", a."studentId"
    ) sa
    GROUP BY sa."tutorId"
  `;
}

export async function getTutorRanking(
  organizationId: string
): Promise<TutorRankingRow[]> {
  const [tutors, scoreRows] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId, role: "TUTOR" },
      select: {
        id: true,
        name: true,
        isActive: true,
        tutorOfGroups: {
          where: { organizationId },
          select: {
            name: true,
            // A'zolar soni bazada sanaladi — bu yerda faqat son kerak,
            // o'quvchilar ro'yxati emas.
            _count: { select: { students: true } },
          },
        },
      },
    }),
    getTutorScoreRows(organizationId),
  ]);

  const scoreByTutor = new Map(scoreRows.map((row) => [row.tutorId, row]));

  const rows: TutorRankingRow[] = tutors.map((tutor) => {
    const score = scoreByTutor.get(tutor.id);

    return {
      tutorId: tutor.id,
      tutorName: tutor.name,
      isActive: tutor.isActive,
      groupName: tutor.tutorOfGroups.map((g) => g.name).join(", ") || "—",
      studentCount: tutor.tutorOfGroups.reduce(
        (sum, g) => sum + g._count.students,
        0
      ),
      scoredStudentCount: score?.scoredStudentCount ?? 0,
      averageScore: score?.averageScore ?? null,
    };
  });

  rows.sort((a, b) => {
    // Hozirgi o'quvchisi qolmagan ustoz reyting BOSHIDA turmaydi: uning bali
    // boshqa guruhga ko'chirilgan eski o'quvchilardan qolgan va bugungi ishni
    // ko'rsatmaydi. Uni ro'yxatdan olib tashlash ham to'g'ri emas (natijasi
    // haqiqiy), shuning uchun alohida — pastki qismda — turadi.
    const aEmpty = a.studentCount === 0;
    const bEmpty = b.studentCount === 0;
    if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;

    // Ball yo'q ustozlar ham pastda; teng bo'lsa tartib ism bo'yicha barqaror.
    if (a.averageScore === null && b.averageScore === null) {
      return a.tutorName.localeCompare(b.tutorName);
    }
    if (a.averageScore === null) return 1;
    if (b.averageScore === null) return -1;
    if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
    return a.tutorName.localeCompare(b.tutorName);
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
      ...studentScope(organizationId),
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
    },
    orderBy: { name: "asc" },
  });

  // Ball va imtihonlar soni bazada agregatsiya qilinadi: ilgari har bir
  // o'quvchining BARCHA urinish qatorlari Node'ga tortilardi (500 o'quvchi ×
  // 50 imtihon = 25 000 qator), endi o'quvchi boshiga bittadan qator qaytadi.
  // Filtr avvalgidek: faqat yakunlangan imtihonlar — tutorDashboard'dagi
  // getRosterForGroup bilan bir xil qoida (tashlab ketilgan urinish na ballga,
  // na "imtihonlar" ustuniga kirmaydi).
  const stats =
    students.length === 0
      ? []
      : await prisma.attempt.groupBy({
          by: ["studentId"],
          where: {
            studentId: { in: students.map((s) => s.id) },
            mode: "EXAM",
            finishedAt: { not: null },
          },
          _avg: { score: true },
          _count: { _all: true },
        });

  const statByStudent = new Map(stats.map((row) => [row.studentId, row]));

  return students
    // `studentScope` allaqachon profilsizlarni chiqarib tashlagan — bu satr
    // faqat TypeScript uchun (profil tipida hamon `null` bo'lishi mumkin).
    .filter((s) => s.studentProfile !== null)
    .map((s) => {
      const stat = statByStudent.get(s.id);
      const rawAverage = stat?._avg.score ?? null;
      const averageScore = rawAverage === null ? null : Math.round(rawAverage);

      return {
        studentId: s.id,
        name: s.name,
        isActive: s.isActive,
        groupId: s.studentProfile!.group.id,
        groupName: s.studentProfile!.group.name,
        tutorName: s.studentProfile!.group.tutor.name,
        examAttemptCount: stat?._count._all ?? 0,
        averageScore,
        status: readinessFromScore(averageScore),
      };
    });
}

/**
 * Faqat "tashkilotda umuman o'quvchi bormi?" tekshiruvi uchun. Ilgari buning
 * uchun `listStudentsForOrganization` ikkinchi marta (filtrsiz) chaqirilardi
 * va natijadan faqat `.length` ishlatilardi — har sahifa yuklanishida ikkita
 * bir xil og'ir so'rov. Sanoq sharti ro'yxatnikiga aynan mos
 * (`studentScope`), aks holda "0 ta o'quvchi" bo'sh holati ro'yxat bilan zid
 * chiqishi mumkin edi.
 */
export async function countStudentsForOrganization(
  organizationId: string
): Promise<number> {
  return prisma.user.count({ where: studentScope(organizationId) });
}
