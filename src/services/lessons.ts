import { prisma } from "@/lib/prisma";
import { UZBEKISTAN_UTC_OFFSET_HOURS } from "@/lib/format";

/**
 * Dars jadvali.
 *
 * Takrorlanish QOIDASI saqlanmaydi — jadval tuzilganda darslar bir yo'la
 * yaratiladi (`createLessonSeries`). Sababi `prisma/schema.prisma` dagi
 * `Lesson` izohida: dars ko'chiriladi, bekor qilinadi, mavzusi o'zgaradi;
 * qoida saqlansa har bir istisno uchun alohida mexanizm kerak bo'lardi.
 *
 * Barcha vaqtlar bazada UTC'da saqlanadi va O'zbekiston vaqti (UTC+5)
 * bo'yicha ko'rsatiladi — `lib/format.ts` bilan bir xil qoida.
 */

export class LessonError extends Error {
  constructor(
    message: string,
    readonly status: number = 400
  ) {
    super(message);
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
const OFFSET_MS = UZBEKISTAN_UTC_OFFSET_HOURS * 60 * 60 * 1000;

/** Bir marta tuzilganda yaratiladigan eng ko'p dars soni. */
export const MAX_LESSONS_PER_SERIES = 60;

/** Jadval nechta haftaga tuzilishi mumkin. */
export const MAX_WEEKS = 26;

/** Dars davomiyligi chegaralari (daqiqa). */
export const MIN_DURATION_MIN = 30;
export const MAX_DURATION_MIN = 300;

export type LessonRow = {
  id: string;
  groupId: string;
  groupName: string;
  startsAt: Date;
  durationMin: number;
  topicId: string | null;
  topicName: string | null;
  note: string | null;
};

const LESSON_SELECT = {
  id: true,
  groupId: true,
  startsAt: true,
  durationMin: true,
  topicId: true,
  note: true,
  group: { select: { name: true } },
  topic: { select: { name: true } },
} as const;

type LessonSelected = {
  id: string;
  groupId: string;
  startsAt: Date;
  durationMin: number;
  topicId: string | null;
  note: string | null;
  group: { name: string };
  topic: { name: string } | null;
};

function toRow(lesson: LessonSelected): LessonRow {
  return {
    id: lesson.id,
    groupId: lesson.groupId,
    groupName: lesson.group.name,
    startsAt: lesson.startsAt,
    durationMin: lesson.durationMin,
    topicId: lesson.topicId,
    topicName: lesson.topic?.name ?? null,
    note: lesson.note,
  };
}

/** Berilgan lahzaning O'zbekiston kuni boshi (UTC'dagi lahza sifatida). */
export function uzDayStart(at: number = Date.now()): Date {
  return new Date(Math.floor((at + OFFSET_MS) / DAY_MS) * DAY_MS - OFFSET_MS);
}

/**
 * Guruhning darslari.
 *
 * `from` berilmasa — bugundan boshlab. O'tgan darslarni ko'rish uchun
 * `from` ga aniq sana beriladi (guruh sahifasida "o'tgan darslar" bo'limi).
 */
export async function listLessonsForGroup(
  groupId: string,
  options: { from?: Date; to?: Date; limit?: number } = {}
): Promise<LessonRow[]> {
  const rows = await prisma.lesson.findMany({
    where: {
      groupId,
      startsAt: {
        gte: options.from ?? uzDayStart(),
        ...(options.to ? { lte: options.to } : {}),
      },
    },
    select: LESSON_SELECT,
    orderBy: { startsAt: "asc" },
    take: options.limit,
  });
  return rows.map(toRow);
}

/** Guruhning o'tgan darslari — eng yaqini birinchi. */
export async function listPastLessonsForGroup(
  groupId: string,
  limit = 5
): Promise<LessonRow[]> {
  const rows = await prisma.lesson.findMany({
    where: { groupId, startsAt: { lt: uzDayStart() } },
    select: LESSON_SELECT,
    orderBy: { startsAt: "desc" },
    take: limit,
  });
  return rows.map(toRow);
}

/**
 * Bugungi darslar — "Bugungi ish" paneli uchun.
 *
 * `tutorId` berilsa faqat o'sha ustozning guruhlari, aks holda butun
 * tashkilot (direktor uchun).
 */
export async function listTodayLessons(params: {
  /** Butun tashkilot bo'yicha — direktor uchun. */
  organizationId?: string;
  /** Faqat shu ustozning guruhlari. Berilsa `organizationId` shart emas:
   *  ustoz bitta tashkilotga tegishli va guruhlari ham o'sha yerda. */
  tutorId?: string;
}): Promise<LessonRow[]> {
  if (!params.organizationId && !params.tutorId) {
    throw new LessonError("Tashkilot yoki ustoz ko'rsatilishi shart", 400);
  }

  const start = uzDayStart();
  const end = new Date(start.getTime() + DAY_MS);

  const rows = await prisma.lesson.findMany({
    where: {
      startsAt: { gte: start, lt: end },
      group: {
        ...(params.organizationId ? { organizationId: params.organizationId } : {}),
        ...(params.tutorId ? { tutorId: params.tutorId } : {}),
      },
    },
    select: LESSON_SELECT,
    orderBy: { startsAt: "asc" },
  });
  return rows.map(toRow);
}

/**
 * O'quvchining keyingi darsi — o'quvchi panelidagi "Keyingi dars" uchun.
 *
 * Hozirgi paytdan keyingisi, ya'ni bugun soat 14:00 dagi dars soat 15:00
 * da endi ko'rsatilmaydi.
 */
export async function getNextLessonForStudent(
  studentId: string
): Promise<LessonRow | null> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
    select: { groupId: true },
  });
  if (!profile) return null;

  const lesson = await prisma.lesson.findFirst({
    where: { groupId: profile.groupId, startsAt: { gte: new Date() } },
    select: LESSON_SELECT,
    orderBy: { startsAt: "asc" },
  });
  return lesson ? toRow(lesson) : null;
}

export type LessonSeriesInput = {
  groupId: string;
  createdById: string;
  /** Haftaning kunlari: 1 = dushanba … 7 = yakshanba (ISO). */
  weekdays: number[];
  /** Boshlanish soati, O'zbekiston vaqti bo'yicha: 0-23. */
  hour: number;
  /** Boshlanish daqiqasi: 0-59. */
  minute: number;
  durationMin: number;
  /** Necha hafta davomida. */
  weeks: number;
  /** Qaysi kundan boshlab (shu kun ham kiradi). Berilmasa — bugundan. */
  startFrom?: Date;
  topicId?: string | null;
  note?: string | null;
};

/**
 * Jadval tuzadi: tanlangan hafta kunlari uchun darslar bir yo'la
 * yaratiladi.
 *
 * Misol: dushanba va chorshanba, 14:00, 8 hafta → 16 ta dars.
 *
 * Allaqachon mavjud darslar TEKSHIRILMAYDI va ustiga yozilmaydi — ikki
 * marta bosilsa ikki nusxa chiqadi. Buning oldini olish uchun chaqiruvchi
 * tomonda tasdiq oynasi bor va qo'shilgan darslar soni qaytariladi.
 */
export async function createLessonSeries(
  input: LessonSeriesInput
): Promise<{ created: number }> {
  if (input.weekdays.length === 0) {
    throw new LessonError("Kamida bitta kun tanlang");
  }
  if (input.weekdays.some((day) => day < 1 || day > 7)) {
    throw new LessonError("Hafta kuni noto'g'ri");
  }
  if (input.hour < 0 || input.hour > 23 || input.minute < 0 || input.minute > 59) {
    throw new LessonError("Vaqt noto'g'ri");
  }
  if (input.durationMin < MIN_DURATION_MIN || input.durationMin > MAX_DURATION_MIN) {
    throw new LessonError(
      `Davomiyligi ${MIN_DURATION_MIN} va ${MAX_DURATION_MIN} daqiqa orasida bo'lishi kerak`
    );
  }
  if (input.weeks < 1 || input.weeks > MAX_WEEKS) {
    throw new LessonError(`Hafta soni 1 va ${MAX_WEEKS} orasida bo'lishi kerak`);
  }

  const weekdays = new Set(input.weekdays);
  const firstDay = input.startFrom
    ? uzDayStart(input.startFrom.getTime())
    : uzDayStart();

  const starts: Date[] = [];
  for (let offset = 0; offset < input.weeks * 7; offset += 1) {
    const dayStart = firstDay.getTime() + offset * DAY_MS;
    // Hafta kuni O'ZBEKISTON vaqti bo'yicha aniqlanadi: `getUTCDay`
    // siljitilgan lahzadan o'qiladi, aks holda server vaqt mintaqasiga
    // qarab dushanba yakshanba bo'lib qolardi.
    const shifted = new Date(dayStart + OFFSET_MS);
    const isoWeekday = shifted.getUTCDay() === 0 ? 7 : shifted.getUTCDay();
    if (!weekdays.has(isoWeekday)) continue;

    starts.push(
      new Date(dayStart + (input.hour * 60 + input.minute) * 60 * 1000)
    );
  }

  if (starts.length === 0) {
    throw new LessonError("Tanlangan davrda birorta ham dars chiqmadi");
  }
  if (starts.length > MAX_LESSONS_PER_SERIES) {
    throw new LessonError(
      `Bir marta eng ko'pi bilan ${MAX_LESSONS_PER_SERIES} ta dars qo'shiladi. Hafta sonini kamaytiring.`
    );
  }

  const result = await prisma.lesson.createMany({
    data: starts.map((startsAt) => ({
      groupId: input.groupId,
      createdById: input.createdById,
      startsAt,
      durationMin: input.durationMin,
      topicId: input.topicId ?? null,
      note: input.note ?? null,
    })),
  });

  return { created: result.count };
}

/** Ruxsat tekshiruvi uchun — dars qaysi guruhga tegishli. */
export async function getLessonGroupRef(
  lessonId: string
): Promise<{ lessonId: string; groupId: string; group: { tutorId: string; organizationId: string } } | null> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      groupId: true,
      group: { select: { tutorId: true, organizationId: true } },
    },
  });
  if (!lesson) return null;
  return { lessonId: lesson.id, groupId: lesson.groupId, group: lesson.group };
}

export async function deleteLesson(lessonId: string): Promise<void> {
  const deleted = await prisma.lesson.deleteMany({ where: { id: lessonId } });
  if (deleted.count === 0) {
    throw new LessonError("Dars topilmadi", 404);
  }
}

/** Guruhning KELAJAKDAGI barcha darslarini o'chiradi — jadvalni qayta tuzish uchun. */
export async function deleteUpcomingLessons(groupId: string): Promise<{ deleted: number }> {
  const result = await prisma.lesson.deleteMany({
    where: { groupId, startsAt: { gte: uzDayStart() } },
  });
  return { deleted: result.count };
}
