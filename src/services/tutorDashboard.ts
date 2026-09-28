import { prisma } from "@/lib/prisma";
import { getMasteryByTopic } from "@/services/studentDashboard";
import {
  listAssignmentsForGroup,
  type GroupAssignment,
} from "@/services/assignments";
// Tiplar `tutorTypes.ts` da, guruh tahlili `groupAnalytics.ts` da
// (2026-09-28 da ajratilgan) — pastda ikkalasi qayta eksport qilinadi.
import type {
  RosterEntry,
  StudentDetail,
  StudentGroupContext,
  TutorGroup,
} from "@/services/tutorTypes";
import {
  averageScoreFromRoster,
  getRosterForGroup,
} from "@/services/groupAnalytics";

/** Ustozga biriktirilgan guruhlar ro'yxati. */
export async function getGroupsForTutor(tutorId: string): Promise<TutorGroup[]> {
  return prisma.group.findMany({
    where: { tutorId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/**
 * So'nggi `days` kun ichida SHU GURUHDA boshlangan va YAKUNLANGAN
 * imtihonlar soni.
 *
 * Filtr `Attempt.groupId` bo'yicha — o'quvchining hozirgi guruhi bo'yicha
 * emas. Farqi: o'quvchi boshqa guruhga ko'chirilsa, uning eski urinishlari
 * eski guruhda qoladi va yangi ustozning ko'rsatkichiga qo'shilib ketmaydi.
 *
 * `finishedAt: { not: null }` shart: ilgari tashlab ketilgan (ochib qo'yib
 * chiqib ketilgan) imtihonlar ham sanalardi va ekranda o'zaro zid raqamlar
 * chiqardi — plitkada "5 imtihon", jadvalda esa o'sha o'quvchilarda
 * "0 imtihon" va "Imtihon topshirilmagan". Jadval va mavzu diagrammasi
 * allaqachon yakunlanganlarni sanaydi, plitka ham shu qoidaga keltirildi.
 */
export async function getRecentExamAttemptCount(
  groupId: string,
  days = 7
): Promise<number> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return prisma.attempt.count({
    where: {
      groupId,
      mode: "EXAM",
      finishedAt: { not: null },
      startedAt: { gte: since },
    },
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
      group: {
        select: { id: true, name: true, tutorId: true, organizationId: true },
      },
    },
  });
  if (!profile) return null;

  return {
    student: { userId: profile.userId, organizationId: profile.user.organizationId },
    group: { tutorId: profile.group.tutorId, organizationId: profile.group.organizationId },
    groupId: profile.group.id,
    groupName: profile.group.name,
  };
}

/**
 * O'quvchining mavzular bo'yicha o'zlashtirishi (eng zaif mavzu birinchi)
 * va yakunlangan urinishlar tarixi.
 *
 * Mavzu foizi o'quvchining O'Z panelidagi bilan bitta funksiyadan
 * (`getMasteryByTopic`) olinadi. Ilgari bu yerda alohida, Node'da
 * hisoblanadigan nusxa turardi va u boshqa qoidada ishlardi (mashqlarni ham
 * qo'shardi, javobsizni ko'rmasdi) — natijada ustoz bilan o'quvchi bir xil
 * mavzu uchun boshqa-boshqa foiz ko'rardi. Endi manba bitta: yakunlangan
 * imtihonlar, javobsiz savol xato deb sanaladi.
 */
export async function getStudentDetailForTutor(
  studentId: string
): Promise<StudentDetail | null> {
  const user = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      name: true,
      isActive: true,
      studentProfile: { select: { group: { select: { name: true } } } },
    },
  });
  if (!user) return null;

  const [masteryByTopic, attemptRows] = await Promise.all([
    // FAQAT o'quvchi imtihonda uchratgan mavzular chiqadi (getMasteryByTopic
    // shunday ishlaydi). Ilgari barcha mavzular olinib, ma'lumot yo'qlari 0%
    // deb belgilanardi va ro'yxat o'sish bo'yicha saralangani uchun "hech
    // urinilmagan" mavzular "eng zaif" bo'lib ro'yxat boshini to'ldirib
    // tashlardi — ustoz haqiqiy zaif mavzuni ko'rmay qolardi.
    getMasteryByTopic(studentId),
    // Tarix esa ataylab IKKALA rejimni ham ko'rsatadi (har qatorda "Imtihon"
    // yoki "Mashq" belgisi bor) — bu statistika emas, faollik jurnali.
    prisma.attempt.findMany({
      where: { studentId, finishedAt: { not: null } },
      orderBy: { finishedAt: "desc" },
      select: { id: true, finishedAt: true, score: true, mode: true },
    }),
  ]);

  const attempts = attemptRows.map((a) => ({
    id: a.id,
    date: (a.finishedAt as Date).toISOString(),
    score: a.score,
    mode: a.mode,
  }));

  return {
    name: user.name,
    isActive: user.isActive,
    groupName: user.studentProfile?.group.name ?? null,
    masteryByTopic,
    attempts,
  };
}

export type TutorGroupSummary = {
  id: string;
  name: string;
  studentCount: number;
  averageScore: number | null;
  /** So'nggi haftadagi yakunlangan imtihonlar. */
  recentExamCount: number;
  lastActivityAt: Date | null;
};

/**
 * Ustozning guruhlari va har birining qisqa ko'rsatkichlari — ustoz
 * panelidagi ro'yxat uchun.
 *
 * Guruhlar soni oz (odatda 1-5 ta), shuning uchun har biri uchun mavjud
 * funksiyalar qayta ishlatiladi: hisob qoidasi guruh sahifasidagi bilan
 * AYNI bo'lsin — aks holda ro'yxatdagi o'rtacha ball guruh sahifasidagidan
 * farq qilib qolardi.
 */
export async function getGroupSummariesForTutor(
  tutorId: string
): Promise<TutorGroupSummary[]> {
  const groups = await getGroupsForTutor(tutorId);
  return Promise.all(
    groups.map(async (group) => {
      const [roster, recentExamCount] = await Promise.all([
        getRosterForGroup(group.id),
        getRecentExamAttemptCount(group.id),
      ]);
      const activityTimes = roster
        .map((entry) => entry.lastActivityAt)
        .filter((date): date is Date => date !== null)
        .map((date) => date.getTime());
      return {
        id: group.id,
        name: group.name,
        studentCount: roster.length,
        averageScore: averageScoreFromRoster(roster),
        recentExamCount,
        lastActivityAt: activityTimes.length > 0 ? new Date(Math.max(...activityTimes)) : null,
      };
    })
  );
}

/** Ustozning barcha o'quvchilari — guruh nomi bilan birga. */
export type TutorStudentRow = RosterEntry & {
  groupId: string;
  groupName: string;
};

/**
 * Ustozning BARCHA guruhlaridagi o'quvchilar bitta ro'yxatda.
 *
 * Nega kerak: 3 guruhi bor ustoz hozir har guruhni alohida ochishi kerak
 * edi. "Aziz qaysi guruhda edi?", "45 o'quvchim ichida kim eng orqada?"
 * degan savollarga javob yo'q edi.
 *
 * Har guruh uchun `getRosterForGroup` chaqiriladi — ustozda guruh kam
 * (odatda 1-4 ta), shuning uchun alohida birlashtirilgan so'rov yozish
 * ortiqcha murakkablik bo'lardi. Direktorda esa bu yo'l tanlanmagan:
 * u yerda guruh 8-20 ta va o'sha sababdan alohida funksiya bor
 * (`listStudentsForOrganization`).
 */
export async function listStudentsForTutor(
  tutorId: string
): Promise<TutorStudentRow[]> {
  const groups = await getGroupsForTutor(tutorId);
  if (groups.length === 0) return [];

  const rosters = await Promise.all(
    groups.map(async (group) => {
      const roster = await getRosterForGroup(group.id);
      return roster.map((entry) => ({
        ...entry,
        groupId: group.id,
        groupName: group.name,
      }));
    })
  );

  return rosters.flat().sort((a, b) => a.name.localeCompare(b.name));
}

/** Guruh nomi qo'shilgan vazifa — ustozning umumiy ro'yxati uchun. */
export type TutorAssignmentRow = GroupAssignment & {
  groupId: string;
  groupName: string;
};

/**
 * Ustozning barcha guruhlaridagi vazifalar, muddati bo'yicha tartiblangan.
 *
 * Vazifa berish — ustozning YAGONA o'ziga xos ishi (direktor ham,
 * qabulxona ham qila olmaydi), lekin u faqat guruh sahifasi ichida
 * ko'rinardi. 3 guruhga vazifa bergan ustoz "qaysisining muddati yaqin,
 * kim bajarmagan?" degan savolga uchta sahifani ochmasdan javob topa
 * olmasdi.
 *
 * Tartib: muddati yaqinlari birinchi, muddati o'tganlari oxirida —
 * o'tgan vazifa endi harakat talab qilmaydi, u faqat tarix.
 */
export async function listAssignmentsForTutor(
  tutorId: string,
  now: Date = new Date()
): Promise<TutorAssignmentRow[]> {
  const groups = await getGroupsForTutor(tutorId);
  if (groups.length === 0) return [];

  const perGroup = await Promise.all(
    groups.map(async (group) => {
      const assignments = await listAssignmentsForGroup(group.id, now);
      return assignments.map((assignment) => ({
        ...assignment,
        groupId: group.id,
        groupName: group.name,
      }));
    })
  );

  return perGroup.flat().sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? 1 : -1;
    return a.dueAt.getTime() - b.dueAt.getTime();
  });
}

/**
 * Guruh tahlili AJRATILGAN faylda (2026-09-28), lekin shu yerdan qayta
 * eksport qilinadi: `tutorDashboard.ts` — modulning ommaviy kirish
 * nuqtasi va uni o'nlab sahifa import qiladi.
 */
export * from "@/services/tutorTypes";
export {
  getGroupAnalytics,
  getRosterForGroup,
  averageScoreFromRoster,
  type GroupAnalytics,
} from "@/services/groupAnalytics";
