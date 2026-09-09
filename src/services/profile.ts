import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resetUserPassword } from "@/services/users";
import { UZBEKISTAN_UTC_OFFSET_HOURS } from "@/lib/format";

export class ProfileError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type Profile = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
  /** OWNER'da tashkilot yo'q — u butun platformaga tegishli. */
  organizationName: string | null;
  /** Faqat o'quvchida to'ladi. */
  groupName: string | null;
  tutorName: string | null;
};

/**
 * Foydalanuvchining o'z ma'lumotlari.
 *
 * Guruh va ustoz faqat o'quvchida bo'ladi, shuning uchun `studentProfile`
 * ixtiyoriy bog'lanish sifatida o'qiladi — boshqa rollarda u `null`.
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      organization: { select: { name: true } },
      studentProfile: {
        select: {
          group: { select: { name: true, tutor: { select: { name: true } } } },
        },
      },
    },
  });
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    organizationName: user.organization?.name ?? null,
    groupName: user.studentProfile?.group.name ?? null,
    tutorName: user.studentProfile?.group.tutor.name ?? null,
  };
}


/** Ism uzunligi chegarasi — bo'sh ham, cheksiz uzun ham bo'lmasin. */
const NAME_MAX_LENGTH = 60;

export type StudentProfileStats = {
  /** Yakunlangan imtihonlar soni. */
  examCount: number;
  /** Yakunlangan mashqlar soni (maraton ham shu yerda — u mashqning varianti). */
  practiceCount: number;
  /** O'rtacha ball — FAQAT yakunlangan imtihonlardan. */
  averageScore: number | null;
  /**
   * Ketma-ket faol kunlar soni.
   *
   * "Faol kun" = o'sha kuni kamida bitta urinish YAKUNLANGAN. Rejim
   * ajratilmaydi (mashq ham, imtihon ham) — bu ball emas, ODAT
   * ko'rsatkichi.
   */
  streakDays: number;
};

/**
 * Kunlarni O'ZBEKISTON vaqtida ajratish uchun kalit: "2026-09-09".
 *
 * Postgres `date` turi JS'ga UTC yarim tunida keladi, shuning uchun UTC
 * maydonlari o'qiladi. `formatDate` bilan bir xil qoida — ikkalasi ham
 * `UZBEKISTAN_UTC_OFFSET_HOURS` dan kelib chiqadi. Agar kunlar server
 * mintaqasida sanalsa, soat 19:00-24:00 UTC oralig'idagi urinish "ertangi
 * kun"ga tushib, streak noto'g'ri uzilardi yoki uzayardi.
 */
function toDayKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Ketma-ket faol kunlarni sanaydi.
 *
 * Sanoq BUGUNDAN boshlanadi; agar bugun hali urinish bo'lmagan bo'lsa,
 * kechadan. Ya'ni kechagi kun bilan tugagan seriya "tirik" hisoblanadi va
 * o'quvchi bugun mashq qilib uni davom ettira oladi — aks holda ertalab
 * ilovaga kirgan odam seriyasi nolga tushganini ko'rib, davom ettirish
 * istagini yo'qotardi.
 */
function countStreak(dayKeys: Set<string>, nowMs: number): number {
  const offsetMs = UZBEKISTAN_UTC_OFFSET_HOURS * 60 * 60 * 1000;
  const shifted = new Date(nowMs + offsetMs);
  let cursor = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate()
  );

  const DAY_MS = 24 * 60 * 60 * 1000;
  if (!dayKeys.has(toDayKey(new Date(cursor)))) {
    cursor -= DAY_MS; // bugun hali yo'q — kechadan boshlaymiz
  }

  let streak = 0;
  while (dayKeys.has(toDayKey(new Date(cursor)))) {
    streak += 1;
    cursor -= DAY_MS;
  }
  return streak;
}

/**
 * O'quvchi profili uchun ko'rsatkichlar.
 *
 * Faqat O'QUVCHIDA chaqiriladi: ustoz/direktor/owner profilida "kun
 * ketma-ket" yoki "o'rtacha ball" ma'nosiz.
 */
export async function getStudentProfileStats(
  studentId: string
): Promise<StudentProfileStats> {
  const [attempts, dayRows] = await Promise.all([
    prisma.attempt.findMany({
      where: { studentId, finishedAt: { not: null } },
      select: { mode: true, score: true },
    }),
    // Faol kunlar bazada ajratiladi — barcha urinishlarni tortib olib
    // JS'da guruhlash shart emas.
    prisma.$queryRaw<{ d: Date }[]>`
      SELECT DISTINCT
        (a."finishedAt" + make_interval(hours => ${UZBEKISTAN_UTC_OFFSET_HOURS}::int))::date AS d
      FROM "Attempt" a
      WHERE a."studentId" = ${studentId}
        AND a."finishedAt" IS NOT NULL
    `,
  ]);

  const examScores = attempts
    .filter((a) => a.mode === "EXAM" && a.score !== null)
    .map((a) => a.score as number);

  return {
    examCount: attempts.filter((a) => a.mode === "EXAM").length,
    practiceCount: attempts.filter((a) => a.mode === "PRACTICE").length,
    averageScore:
      examScores.length > 0
        ? Math.round(examScores.reduce((sum, s) => sum + s, 0) / examScores.length)
        : null,
    streakDays: countStreak(new Set(dayRows.map((r) => toDayKey(r.d))), Date.now()),
  };
}

/**
 * Foydalanuvchi O'Z ismini o'zgartiradi.
 *
 * Email ATAYLAB o'zgartirilmaydi: u kirish identifikatori va ustoz
 * o'quvchini aynan shu orqali topadi — o'quvchi uni o'zi almashtirsa,
 * ustoz hisobni yo'qotib qo'yishi mumkin. Ism esa odamning o'ziniki va
 * undagi xatoni tuzata olmaslik asossiz; noto'g'ri o'zgartirilsa ustoz
 * uni baribir qayta to'g'irlay oladi.
 *
 * `sessionVersion` oshirilmaydi — ism xavfsizlikka daxldor emas.
 */
export async function updateOwnName(userId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new ProfileError("Ism bo'sh bo'lishi mumkin emas");
  }
  if (trimmed.length > NAME_MAX_LENGTH) {
    throw new ProfileError(`Ism ${NAME_MAX_LENGTH} belgidan oshmasligi kerak`);
  }

  await prisma.user.update({ where: { id: userId }, data: { name: trimmed } });
}

/**
 * Foydalanuvchi O'Z parolini o'zgartiradi.
 *
 * Joriy parol MAJBURIY tekshiriladi — sessiyaning o'zi yetarli emas.
 * Sabab: o'g'irlangan yoki ochiq qolgan cookie bilan kelgan kimsa parolni
 * almashtirib, haqiqiy egasini o'z hisobidan butunlay chiqarib yuborishi
 * mumkin bo'lardi. Joriy parolni so'rash bu yo'lni yopadi.
 *
 * `resetUserPassword` qayta ishlatiladi (ustoz o'quvchining parolini
 * tiklashda ham o'sha ishlatiladi) — hash va `sessionVersion` oshirish
 * mantig'i yagona joyda qolsin.
 *
 * @returns yangi `sessionVersion` — route uni cookie'ga qayta yozishi
 * kerak, aks holda parolni o'zgartirgan odamning O'ZI ham darhol tizimdan
 * chiqib ketardi (boshqa qurilmalardagi sessiyalar esa ataylab o'ladi).
 */
export async function changeOwnPassword(input: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<{ sessionVersion: number }> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { passwordHash: true },
  });
  if (!user) throw new ProfileError("Foydalanuvchi topilmadi", 404);

  const matches = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!matches) {
    throw new ProfileError("Joriy parol noto'g'ri", 400);
  }

  // Bir xil parolni qayta o'rnatish ma'nosiz, lekin zararli tomoni ham bor:
  // `sessionVersion` oshgani uchun foydalanuvchi boshqa qurilmalardagi
  // sessiyalarini hech qanday sababsiz yo'qotardi.
  if (input.currentPassword === input.newPassword) {
    throw new ProfileError("Yangi parol joriy paroldan farq qilishi kerak", 400);
  }

  const updated = await resetUserPassword(input.userId, input.newPassword);
  return { sessionVersion: updated.sessionVersion };
}
