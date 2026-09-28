import { prisma } from "@/lib/prisma";
import { readinessFromScore, type ReadinessStatus } from "@/lib/readiness";
import { studentScope } from "@/services/directorShared";

/**
 * Tashkilotdagi ODAMLAR ro'yxatlari: o'quvchilar, qabulxona xodimlari,
 * ustoz profili.
 *
 * `directorDashboard.ts` dan ajratilgan (2026-09-27). Bular jurnal
 * sahifalarini oziqlantiradi (filtr va qidiruv bilan), panel
 * ko'rsatkichlarini emas.
 */


export type OrganizationStudentRow = {
  studentId: string;
  name: string;
  isActive: boolean;
  groupId: string;
  groupName: string;
  /** Jurnalda ustoz ustuni havola bo'lishi uchun. */
  tutorId: string;
  tutorName: string;
  examAttemptCount: number;
  averageScore: number | null;
  status: ReadinessStatus;
  /**
   * Oxirgi urinish boshlangan vaqt — REJIMDAN QAT'IY NAZAR. Ball faqat
   * imtihondan hisoblanadi, lekin "bu o'quvchi tirikmi?" degan savolga
   * mashq ham javob beradi: har kuni mashq qilayotgan o'quvchi yo'qolgan
   * emas.
   */
  lastActivityAt: Date | null;
};

export type ListStudentsParams = {
  q?: string;
  groupId?: string;
};

/**
 * Bitta so'rovda qaytariladigan eng ko'p o'quvchi.
 *
 * Nega sahifalash EMAS: jurnal sahifasi filtr sonlarini ("e'tibor
 * talab qiladi", "jim", "to'lov") ro'yxatning O'ZIDAN, JS'da
 * hisoblaydi. Sahifalash qo'yilsa, bu sonlar faqat ko'rinayotgan
 * sahifani sanab, direktorga yolg'on raqam ko'rsatardi.
 *
 * To'g'ri yechim — o'sha sonlarni SQL'ga ko'chirish, lekin bu alohida
 * ish. Shu paytgacha chegara qo'yiladi va u ekranda OCHIQ aytiladi:
 * jimgina kesib tashlangan ro'yxat eng yomon variant.
 *
 * 500 — real avtomaktabning o'lchamidan ancha katta (odatda 50-200
 * o'quvchi), ya'ni amalda bu chegaraga yetilmaydi.
 */
export const MAX_STUDENT_ROWS = 500;

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
    take: MAX_STUDENT_ROWS,
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
          group: {
            select: {
              id: true,
              name: true,
              tutor: { select: { id: true, name: true } },
            },
          },
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
  const studentIds = students.map((s) => s.id);
  const [stats, activityRows] = await Promise.all([
    studentIds.length === 0
      ? []
      : prisma.attempt.groupBy({
          by: ["studentId"],
          where: {
            studentId: { in: studentIds },
            mode: "EXAM",
            finishedAt: { not: null },
          },
          _avg: { score: true },
          _count: { _all: true },
        }),
    // Oxirgi faollik — barcha rejimlar bo'yicha (mashq ham hisobga olinadi).
    studentIds.length === 0
      ? []
      : prisma.attempt.groupBy({
          by: ["studentId"],
          where: { studentId: { in: studentIds } },
          _max: { startedAt: true },
        }),
  ]);

  const statByStudent = new Map(stats.map((row) => [row.studentId, row]));
  const activityByStudent = new Map(
    activityRows.map((row) => [row.studentId, row._max.startedAt])
  );

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
        tutorId: s.studentProfile!.group.tutor.id,
        tutorName: s.studentProfile!.group.tutor.name,
        examAttemptCount: stat?._count._all ?? 0,
        averageScore,
        status: readinessFromScore(averageScore),
        lastActivityAt: activityByStudent.get(s.id) ?? null,
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

export type ReceptionStaffRow = {
  userId: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
};

/**
 * Tashkilotdagi qabulxona xodimlari — direktor panelidagi ro'yxat uchun.
 *
 * Ustozlar reytingidan alohida: qabulxonani o'quv ko'rsatkichlari bilan
 * baholab bo'lmaydi (uning o'quvchisi ham, guruhi ham yo'q), shuning
 * uchun bu yerda faqat hisob ma'lumoti.
 */
export async function listReceptionStaff(
  organizationId: string
): Promise<ReceptionStaffRow[]> {
  const rows = await prisma.user.findMany({
    where: { organizationId, role: "RECEPTION" },
    select: { id: true, name: true, email: true, isActive: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  return rows.map((row) => ({
    userId: row.id,
    name: row.name,
    email: row.email,
    isActive: row.isActive,
    createdAt: row.createdAt,
  }));
}

export type TutorProfile = {
  tutorId: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  organizationId: string | null;
};

/**
 * Ustozning hisob ma'lumoti — direktordagi ustoz sahifasi uchun.
 *
 * Ko'rsatkichlar (guruhlar, o'rtacha ball, vazifalar) bu yerda emas:
 * ular mavjud funksiyalardan olinadi (`getGroupSummariesForTutor`,
 * `getTutorRanking`, `listAssignmentsForGroup`), shunda ustoz sahifasidagi
 * raqamlar reyting jadvalidagi bilan hech qachon ajralib qolmaydi.
 *
 * Topilmasa `null` — chaqiruvchi "topilmadi" va "boshqa tashkilot" ni bir
 * xil javob bilan qaytaradi.
 */
export async function getTutorProfile(tutorId: string): Promise<TutorProfile | null> {
  const tutor = await prisma.user.findFirst({
    where: { id: tutorId, role: "TUTOR" },
    select: { id: true, name: true, email: true, isActive: true, createdAt: true, organizationId: true },
  });
  if (!tutor) return null;
  return {
    tutorId: tutor.id,
    name: tutor.name,
    email: tutor.email,
    isActive: tutor.isActive,
    createdAt: tutor.createdAt,
    organizationId: tutor.organizationId,
  };
}
