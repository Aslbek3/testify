import { prisma } from "@/lib/prisma";
import { studentScope } from "@/services/directorShared";
import { cachedStatsRead } from "@/lib/cachedRead";
import { UZBEKISTAN_UTC_OFFSET_HOURS } from "@/lib/format";


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
  /**
   * Ustozning guruhlari — jurnalda har biri alohida havola bo'ladi.
   * `groupName` (vergul bilan birlashtirilgan satr) ham qoladi: uni
   * `TutorRankingTable` ishlatadi va u yerda havola kerak emas.
   */
  groups: { id: string; name: string; studentCount: number }[];
  /**
   * Oxirgi marta qachon vazifa bergani. `null` — hech qachon bermagan.
   *
   * Nega kerak: ustozni FAQAT o'quvchilarining bali bilan baholash
   * noto'g'ri (`docs/ishlar.md`). Zaif guruh olgan, lekin har hafta
   * ishlaydigan ustoz bilan yaxshi guruh olib hech narsa qilmaydigan
   * ustoz bir xil ko'rinmasligi kerak.
   */
  lastAssignmentAt: Date | null;
};

export type GroupOverviewRow = {
  groupId: string;
  groupName: string;
  /** Tahrirlash modalida hozirgi ustozni oldindan tanlash uchun kerak. */
  tutorId: string;
  tutorName: string;
  studentCount: number;
  /**
   * Shu guruhga (`Attempt.groupId`) bog'langan urinishlar soni. Faqat sanoq
   * uchun emas — guruhni o'chirish mumkinmi-yo'qmi shundan aniqlanadi
   * (izohi `deleteGroup`da), shuning uchun jadval tugmani bosishdan oldin
   * ham sababni ko'rsata oladi.
   */
  attemptCount: number;
  lastActivityAt: Date | null;
  /**
   * Guruhning imtihon o'rtachasi — `getOrganizationAverageScore` bilan AYNI
   * qoida bo'yicha (EXAM + yakunlangan + avval o'quvchi o'rtachasi).
   * `null` — guruhda hali birorta yakunlangan imtihon yo'q.
   */
  averageScore: number | null;
  /**
   * `averageScore` nechta o'quvchining natijasidan chiqqani. `studentCount`
   * bilan teng bo'lishi SHART EMAS: ball urinish topshirilgan paytdagi guruh
   * (`Attempt.groupId`) bo'yicha hisoblanadi, ya'ni boshqa guruhga
   * ko'chirilgan o'quvchining eski natijasi eski guruhda qoladi.
   */
  scoredStudentCount: number;
};

/**
 * O'quvchini sanashning YAGONA ta'rifi — direktor panelidagi barcha joyda
 * shu ishlatiladi (plitka, bo'sh holat tekshiruvi, ro'yxat). Guruh profili
 * yo'q STUDENT qatori hech qaysi guruhga tegishli emas va jadvalda
 * ko'rsatib ham bo'lmaydi, shuning uchun sanoqqa ham kirmaydi: aks holda
 * plitka "50", ro'yxat esa "48" ko'rsatardi.
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
  const [tutors, scoreRows, assignmentRows] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId, role: "TUTOR" },
      select: {
        id: true,
        name: true,
        isActive: true,
        tutorOfGroups: {
          where: { organizationId },
          select: {
            id: true,
            name: true,
            // A'zolar soni bazada sanaladi — bu yerda faqat son kerak,
            // o'quvchilar ro'yxati emas.
            _count: { select: { students: true } },
          },
          orderBy: { name: "asc" },
        },
      },
    }),
    getTutorScoreRows(organizationId),
    // Oxirgi vazifa — beruvchi bo'yicha. `createdById` guruh boshqa ustozga
    // o'tsa ham o'zgarmaydi, ya'ni bu aynan "shu ustoz ish qildimi" degan
    // savolga javob beradi.
    prisma.assignment.groupBy({
      by: ["createdById"],
      where: { group: { organizationId } },
      _max: { createdAt: true },
    }),
  ]);

  const scoreByTutor = new Map(scoreRows.map((row) => [row.tutorId, row]));
  const lastAssignmentByTutor = new Map(
    assignmentRows.map((row) => [row.createdById, row._max.createdAt])
  );

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
      groups: tutor.tutorOfGroups.map((g) => ({
        id: g.id,
        name: g.name,
        studentCount: g._count.students,
      })),
      lastAssignmentAt: lastAssignmentByTutor.get(tutor.id) ?? null,
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

/**
 * Direktor panelidagi guruhlar jadvali.
 *
 * Ikki narsa ataylab shunday:
 * 1. Sonlar bazada sanaladi (`_count`) — ilgari guruhning BARCHA o'quvchilari
 *    va ularning oxirgi urinishlari Node'ga tortilib, `students.length` uchun
 *    ishlatilardi.
 * 2. "So'nggi faollik" `Attempt.groupId` bo'yicha o'lchanadi — o'quvchining
 *    hozirgi guruhi bo'yicha emas. Ilgari bu ustun guruhning HOZIRGI
 *    a'zolarining istalgan guruhdagi urinishini ko'rsatardi: yangi
 *    ko'chirilgan o'quvchi bilan bo'sh guruh ham "kecha faol" bo'lib
 *    chiqardi. Endi u ustozlar reytingi va guruh tahlili bilan bir xil
 *    qoidada ishlaydi.
 */
export async function getGroupsOverview(
  organizationId: string
): Promise<GroupOverviewRow[]> {
  const groups = await prisma.group.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      tutorId: true,
      tutor: { select: { name: true } },
      _count: { select: { students: true, attempts: true } },
    },
    // Barqaror tartib: ilgari tartib berilmagani uchun jadval har
    // yuklanishda boshqacha kelishi mumkin edi.
    orderBy: { name: "asc" },
  });

  if (groups.length === 0) return [];

  const [activityRows, scoreRows] = await Promise.all([
    prisma.attempt.groupBy({
      by: ["groupId"],
      where: { groupId: { in: groups.map((g) => g.id) } },
      _max: { startedAt: true },
    }),
    getGroupScoreRows(organizationId),
  ]);

  const lastActivityByGroup = new Map(
    activityRows.map((row) => [row.groupId, row._max.startedAt])
  );
  const scoreByGroup = new Map(scoreRows.map((row) => [row.groupId, row]));

  return groups.map((group) => {
    const score = scoreByGroup.get(group.id);
    return {
      groupId: group.id,
      groupName: group.name,
      tutorId: group.tutorId,
      tutorName: group.tutor.name,
      studentCount: group._count.students,
      attemptCount: group._count.attempts,
      lastActivityAt: lastActivityByGroup.get(group.id) ?? null,
      averageScore: score?.averageScore ?? null,
      scoredStudentCount: score?.scoredStudentCount ?? 0,
    };
  });
}

/**
 * Guruh kesimidagi o'rtacha ball — `getOrganizationAverageScore` va
 * `getTutorScoreRows` bilan AYNI qoida: faqat EXAM, faqat yakunlangan,
 * avval o'quvchi o'rtachasi, keyin o'quvchilar o'rtachasi.
 *
 * Nega avval o'quvchi bo'yicha: aks holda ko'p imtihon topshirgan bitta
 * o'quvchi butun guruh o'rtachasini o'ziga tortib ketardi.
 *
 * Jurnal shu qoidaga tayanadi — guruh qatoridagi foiz avtomaktab
 * o'rtachasi bilan bir xil usulda hisoblangan bo'lishi shart, aks holda
 * taqqoslash chizig'i yolg'on gapiradi.
 */
async function getGroupScoreRows(organizationId: string) {
  return prisma.$queryRaw<
    { groupId: string; averageScore: number; scoredStudentCount: number }[]
  >`
    SELECT
      sa."groupId"                     AS "groupId",
      ROUND(AVG(sa."studentAvg"))::int AS "averageScore",
      COUNT(*)::int                    AS "scoredStudentCount"
    FROM (
      SELECT a."groupId"   AS "groupId",
             a."studentId" AS "studentId",
             ROUND(AVG(a."score")) AS "studentAvg"
      FROM "Attempt" a
      JOIN "Group" g ON g."id" = a."groupId"
      WHERE a."mode" = 'EXAM'
        AND a."finishedAt" IS NOT NULL
        AND a."score" IS NOT NULL
        AND g."organizationId" = ${organizationId}
      GROUP BY a."groupId", a."studentId"
    ) sa
    GROUP BY sa."groupId"
  `;
}


/**
 * "Bugungi ish" paneli uchun — uzoq vaqt kirmagan o'quvchilar soni.
 *
 * Alohida yozilgan, chunki `listStudentsForOrganization` butun ro'yxatni
 * ball statistikasi bilan birga tortadi — panelga esa faqat SON kerak.
 * Panel har sahifa yuklanishida ochiladi, ya'ni bu yo'l tez bo'lishi shart.
 */
export async function countInactiveStudents(
  organizationId: string,
  days: number
): Promise<number> {
  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [studentIds, activeRows] = await Promise.all([
    prisma.user.findMany({
      where: { ...studentScope(organizationId), isActive: true },
      select: { id: true },
    }),
    // Chegaradan KEYIN faollik ko'rsatganlar. Qolganlari — "jim".
    prisma.attempt.findMany({
      where: {
        startedAt: { gte: threshold },
        student: { ...studentScope(organizationId), isActive: true },
      },
      select: { studentId: true },
      distinct: ["studentId"],
    }),
  ]);

  const activeSet = new Set(activeRows.map((row) => row.studentId));
  return studentIds.filter((s) => !activeSet.has(s.id)).length;
}

export type SilentTutor = {
  tutorId: string;
  tutorName: string;
  /** `null` — umuman vazifa bermagan. */
  lastAssignmentAt: Date | null;
  groupCount: number;
};

/**
 * Guruhi bor, lekin uzoq vaqtdan beri vazifa bermagan ustozlar.
 *
 * Guruhsiz ustoz bu ro'yxatga KIRMAYDI: unga vazifa beradigan joy yo'q,
 * ya'ni bu uning aybi emas va direktorga boshqa xabar kerak.
 */
export async function listSilentTutors(
  organizationId: string,
  days: number
): Promise<SilentTutor[]> {
  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [tutors, assignmentRows] = await Promise.all([
    prisma.user.findMany({
      where: {
        organizationId,
        role: "TUTOR",
        isActive: true,
        tutorOfGroups: { some: { organizationId } },
      },
      select: { id: true, name: true, _count: { select: { tutorOfGroups: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.assignment.groupBy({
      by: ["createdById"],
      where: { group: { organizationId } },
      _max: { createdAt: true },
    }),
  ]);

  const lastByTutor = new Map(
    assignmentRows.map((row) => [row.createdById, row._max.createdAt])
  );

  return tutors
    .map((tutor) => ({
      tutorId: tutor.id,
      tutorName: tutor.name,
      lastAssignmentAt: lastByTutor.get(tutor.id) ?? null,
      groupCount: tutor._count.tutorOfGroups,
    }))
    .filter(
      (tutor) =>
        tutor.lastAssignmentAt === null || tutor.lastAssignmentAt < threshold
    );
}

export type DailyActivityPoint = {
  /** Kun boshi, O'zbekiston vaqti bo'yicha. */
  date: Date;
  /** Shu kuni kamida bitta urinish boshlagan NOYOB o'quvchilar soni. */
  studentCount: number;
};

/**
 * Kunlik faollik — direktor panelidagi grafik uchun.
 *
 * Urinishlar soni EMAS, noyob o'quvchilar soni sanaladi. Sabab: bitta
 * o'quvchi kuniga 20 ta mashq ishlashi mumkin va u grafikni butunlay o'ziga
 * tortib ketardi. Direktorning savoli esa "bugun nechta o'quvchi ishladi?".
 *
 * Kun chegarasi O'zbekiston vaqti (UTC+5) bo'yicha — `lib/format.ts` dagi
 * `formatDate` bilan AYNI qoida. Aks holda kechqurun 20:00 da ishlagan
 * o'quvchi grafikda ertangi kunga tushib qolardi.
 *
 * Bog'lanish `Attempt.groupId → Group.organizationId` orqali — tashkilot
 * bo'yicha barcha hisob-kitoblarda shu qoida ishlatiladi.
 *
 * Ma'lumot yo'q kunlar SQL natijasida umuman bo'lmaydi, shuning uchun
 * ro'yxat JavaScript tomonda to'ldiriladi: grafikda uzilish bo'lmasligi
 * kerak, "o'sha kuni hech kim ishlamagan" ham ma'lumot.
 */
/**
 * Faollik grafigi — keshlangan (`lib/cachedRead.ts` shartlariga javob
 * beradi: kunlik statistika sekin o'zgaradi, foydalanuvchiga xos emas,
 * va direktor o'z amalining natijasini shu grafikda kutmaydi).
 */
const getDailyActivityCached = cachedStatsRead(
  getDailyActivityUncached,
  ["director-daily-activity"]
);

/**
 * ⚠️ `unstable_cache` natijani JSON orqali saqlaydi, ya'ni `Date`
 * obyekti qaytishda SATRGA aylanadi. Bu jimgina xato beradi: grafik
 * komponenti `date.getTime()` ni chaqiradi va sahifa yiqiladi.
 *
 * Shuning uchun sana bu yerda qayta tiklanadi. Keshlangan funksiya
 * o'zi o'zgarmaydi — u baribir `Date` qaytaradi, faqat kesh orqali
 * o'tganda tipi yo'qoladi.
 */
export async function getDailyActivity(
  organizationId: string,
  days: number
): Promise<DailyActivityPoint[]> {
  const points = await getDailyActivityCached(organizationId, days);
  return points.map((point) => ({ ...point, date: new Date(point.date) }));
}

async function getDailyActivityUncached(
  organizationId: string,
  days: number
): Promise<DailyActivityPoint[]> {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const OFFSET_MS = UZBEKISTAN_UTC_OFFSET_HOURS * 60 * 60 * 1000;

  /** Berilgan vaqtning O'zbekiston kuni boshi (UTC'dagi lahza sifatida). */
  function uzDayStart(at: number): number {
    return Math.floor((at + OFFSET_MS) / DAY_MS) * DAY_MS - OFFSET_MS;
  }

  const todayStart = uzDayStart(Date.now());
  const firstDayStart = todayStart - (days - 1) * DAY_MS;

  // Siljish `make_interval(hours => ...)` bilan emas, oraliqni ko'paytirish
  // orqali quriladi: Prisma son parametrini PostgreSQL'ga `bigint` qilib
  // yuboradi, `make_interval` esa `int` kutadi va so'rov 42883 xatosi bilan
  // tushadi. Shu sababli parametr aniq `::int` ga keltiriladi.
  //
  // Izoh SQL ichida EMAS: u yerda teskari tirnoq shablon satrini uzib
  // yuboradi va fayl umuman parse bo'lmaydi.
  const rows = await prisma.$queryRaw<{ dayStart: Date; studentCount: number }[]>`
    SELECT
      date_trunc(
        'day',
        a."startedAt" + (${UZBEKISTAN_UTC_OFFSET_HOURS}::int * interval '1 hour')
      ) - (${UZBEKISTAN_UTC_OFFSET_HOURS}::int * interval '1 hour') AS "dayStart",
      COUNT(DISTINCT a."studentId")::int                          AS "studentCount"
    FROM "Attempt" a
    JOIN "Group" g ON g."id" = a."groupId"
    WHERE g."organizationId" = ${organizationId}
      AND a."startedAt" >= ${new Date(firstDayStart)}
    GROUP BY 1
    ORDER BY 1
  `;

  const byDay = new Map(rows.map((row) => [row.dayStart.getTime(), row.studentCount]));

  return Array.from({ length: days }, (_, index) => {
    const dayStart = firstDayStart + index * DAY_MS;
    return {
      date: new Date(dayStart),
      studentCount: byDay.get(dayStart) ?? 0,
    };
  });
}


/**
 * Guruhlar va odamlar ro'yxatlari AJRATILGAN fayllarda (2026-09-27),
 * lekin shu yerdan qayta eksport qilinadi: `directorDashboard.ts` —
 * modulning ommaviy kirish nuqtasi va uni o'nlab sahifa import qiladi.
 * Qayta eksport bo'lmasa, bo'lish har bir chaqiruvchini tahrirlashni
 * talab qilardi.
 */
export { DirectorActionError, studentScope } from "@/services/directorShared";
export {
  GROUP_NAME_MAX_LENGTH,
  listTutorsForOrganization,
  createGroup,
  getGroupDetail,
  updateGroup,
  deleteGroup,
  listGroupsForOrganization,
  type GroupDetail,
} from "@/services/directorGroups";
export {
  MAX_STUDENT_ROWS,
  listStudentsForOrganization,
  countStudentsForOrganization,
  listReceptionStaff,
  getTutorProfile,
  type OrganizationStudentRow,
  type ListStudentsParams,
  type ReceptionStaffRow,
  type TutorProfile,
} from "@/services/directorPeople";
