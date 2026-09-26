import { prisma } from "@/lib/prisma";
import { getStudentAccess, type StudentAccess } from "@/lib/studentAccess";

/**
 * Qabulxona paneli uchun ma'lumot. Boshqa panellardan farqi — bu yerda
 * "bugun kimga qo'ng'iroq qilish kerak" degan savolga javob beriladi,
 * statistika emas.
 */

/** Muddati tugayotgan o'quvchi — qo'ng'iroq uchun. */
export type ExpiringStudent = {
  studentId: string;
  name: string;
  /** Telefon hali hech qayerda to'ldirilmaydi (`User.phone` — kelajak uchun). */
  phone: string | null;
  email: string;
  groupName: string | null;
  access: StudentAccess;
};

export type NewStudentToday = {
  studentId: string;
  name: string;
  groupName: string | null;
  createdAt: Date;
};

export type ReceptionOverview = {
  /** Kutayotgan cheklar soni. */
  pendingPaymentCount: number;
  /**
   * O'sha cheklardagi umumiy summa (so'm).
   *
   * Son yolg'iz turganda "3 ta chek" qancha pul ekanini aytmaydi —
   * qabulxona uchun esa aynan shu muhim: 3 ta chek 150 000 so'mmi yoki
   * 1 350 000 so'mmi, ish tartibi boshqacha bo'ladi.
   */
  pendingPaymentAmount: number;
  studentCount: number;
  expiringSoon: ExpiringStudent[];
  addedToday: NewStudentToday[];
};

/**
 * "Muddati yaqin" chegarasi — kun. Qo'ng'iroq qilib ulgurish uchun bir
 * hafta: undan qisqa bo'lsa o'quvchi yopilib qolgandan keyin xabar
 * beriladi, uzunroq bo'lsa ro'yxat hech qachon qisqarmaydi va unga
 * qaralmay qo'yiladi.
 */
export const EXPIRING_SOON_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * O'zbekiston vaqti bilan "bugun" boshlangan payt.
 *
 * Server UTC'da ishlaydi, avtomaktab esa UTC+5 da: yarim tundan keyin
 * qo'shilgan o'quvchi UTC bo'yicha "kecha" bo'lib qolardi va
 * qabulxonachi uni ro'yxatda ko'rmasdi.
 */
const UZ_OFFSET_MS = 5 * 60 * 60 * 1000;

function startOfUzToday(now: Date): Date {
  const shifted = new Date(now.getTime() + UZ_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - UZ_OFFSET_MS);
}

/**
 * Kirish holati qachon tugashi — "muddati yaqinmi" tekshiruvi uchun.
 * `free` (to'lov o'chiq) va `blocked` (allaqachon yopilgan) ro'yxatga
 * kirmaydi: birinchisida tugaydigan muddat yo'q, ikkinchisida esa
 * qo'ng'iroq kechikkan va u boshqa ish (bu holat "Hisob" ustunida
 * baribir ko'rinadi).
 */
function endsAt(access: StudentAccess): Date | null {
  switch (access.kind) {
    case "trial":
      return access.endsAt;
    case "paid":
      return access.paidUntil;
    case "grace":
      // Imtiyoz kunlari ketyapti — eng shoshilinchi holat.
      return access.endedAt;
    default:
      return null;
  }
}

export async function getReceptionOverview(
  organizationId: string,
  now: Date = new Date()
): Promise<ReceptionOverview> {
  const [pendingPayments, students] = await Promise.all([
    // `aggregate` bitta so'rovda ham sonini, ham summasini beradi.
    prisma.studentPayment.aggregate({
      where: { organizationId, status: "PENDING" },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.user.findMany({
      // `studentProfile` sharti direktor panelidagi `studentScope` bilan
      // bir xil: guruhsiz STUDENT qatori hech qaysi ro'yxatda sanalmaydi.
      where: { organizationId, role: "STUDENT", studentProfile: { isNot: null } },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        studentProfile: { select: { paidUntil: true, group: { select: { name: true } } } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { studentPaymentsEnabledAt: true, trialDays: true },
  });

  const todayStart = startOfUzToday(now);
  const soonLimit = now.getTime() + EXPIRING_SOON_DAYS * DAY_MS;

  const expiringSoon: ExpiringStudent[] = [];
  const addedToday: NewStudentToday[] = [];

  for (const s of students) {
    const groupName = s.studentProfile?.group.name ?? null;

    if (s.createdAt.getTime() >= todayStart.getTime()) {
      addedToday.push({
        studentId: s.id,
        name: s.name,
        groupName,
        createdAt: s.createdAt,
      });
    }

    if (!org) continue;
    const access = getStudentAccess(
      {
        enabledAt: org.studentPaymentsEnabledAt,
        trialDays: org.trialDays,
        studentCreatedAt: s.createdAt,
        paidUntil: s.studentProfile?.paidUntil ?? null,
      },
      now
    );
    const ends = endsAt(access);
    if (ends && ends.getTime() <= soonLimit) {
      expiringSoon.push({
        studentId: s.id,
        name: s.name,
        phone: s.phone,
        email: s.email,
        groupName,
        access,
      });
    }
  }

  // Eng shoshilinchi birinchi: muddati allaqachon o'tganlar (imtiyoz
  // kunlari) ro'yxat boshida turadi.
  expiringSoon.sort((a, b) => {
    const aEnds = endsAt(a.access)?.getTime() ?? 0;
    const bEnds = endsAt(b.access)?.getTime() ?? 0;
    return aEnds - bEnds;
  });
  addedToday.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return {
    pendingPaymentCount: pendingPayments._count,
    // Bo'sh to'plamda `_sum` `null` qaytaradi.
    pendingPaymentAmount: pendingPayments._sum.amount ?? 0,
    studentCount: students.length,
    expiringSoon,
    addedToday,
  };
}
