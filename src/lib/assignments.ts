import type { AssignmentKind } from "@prisma/client";
import type { BadgeVariant } from "@/components/Badge";
import { UZBEKISTAN_UTC_OFFSET_HOURS } from "@/lib/format";

/**
 * Vazifa qoidalarining yagona manbasi. Bu yerda Prisma ishlatilmaydi
 * (faqat enum tipi), shuning uchun uni service ham, ustoz formasi ham
 * bemalol import qiladi — chegaralar ikki joyda alohida yozilib, bir-biridan
 * ajralib ketmaydi.
 */

/** Bitta vazifada eng ko'pi bilan nechta imtihon/mashq so'rash mumkin. */
export const ASSIGNMENT_MAX_TARGET = 20;

/** Muddat bugundan eng uzog'i bilan necha kun keyin bo'lishi mumkin. */
export const ASSIGNMENT_MAX_DAYS_AHEAD = 60;

/** Forma ochilganda taklif qilinadigan muddat — bir hafta. */
export const ASSIGNMENT_DEFAULT_DAYS_AHEAD = 7;

export const ASSIGNMENT_NOTE_MAX_LENGTH = 300;

/**
 * Muddati o'tgan vazifa o'quvchi panelida yana necha kun ko'rinib turadi.
 * Darhol yo'qolsa, o'quvchi "bajarmay qoldimmi?" degan savolga javob
 * topolmay qoladi; abadiy tursa, ro'yxat eski vazifalar bilan to'lib ketadi.
 */
export const STUDENT_OVERDUE_VISIBLE_DAYS = 7;

/** Ustoz va direktor esa o'tgan vazifalarni uzoqroq ko'radi — hisobot uchun. */
export const GROUP_OVERDUE_VISIBLE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;
const OFFSET_MS = UZBEKISTAN_UTC_OFFSET_HOURS * 60 * 60 * 1000;

/**
 * Sananing O'zbekiston kalendaridagi kun raqami (1970-01-01 dan beri).
 *
 * "Necha kun qoldi" shu orqali hisoblanadi, soatlar farqidan emas: muddat
 * ertaga soat 23:59 da tugasa, hozir soat 09:00 bo'lsa ham javob "1 kun",
 * "1.6 kun" emas.
 */
function uzDayNumber(date: Date): number {
  return Math.floor((date.getTime() + OFFSET_MS) / DAY_MS);
}

/** Kun raqamidan `yyyy-mm-dd` — `<input type="date">` qiymati. */
function dayNumberToDateString(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Sana tanlash maydonining chegaralari va boshlang'ich qiymati.
 *
 * SERVERDA hisoblanib props orqali beriladi: brauzerda `new Date()`
 * olinsa, server va brauzer vaqti farqli bo'lganda (masalan UTC 19:00 dan
 * keyin) hidratsiya xatosi chiqardi — `lib/format.ts` dagi izohga qara.
 */
export function assignmentDueDateBounds(now: Date = new Date()) {
  const today = uzDayNumber(now);
  return {
    min: dayNumberToDateString(today),
    max: dayNumberToDateString(today + ASSIGNMENT_MAX_DAYS_AHEAD),
    defaultValue: dayNumberToDateString(today + ASSIGNMENT_DEFAULT_DAYS_AHEAD),
  };
}

/**
 * Formadagi `yyyy-mm-dd` ni muddatga aylantiradi: o'sha kunning OXIRI
 * (23:59:59.999), O'zbekiston vaqti bilan. Ya'ni "juma" deb tanlangan
 * vazifani o'quvchi juma kuni kechqurun ham bajara oladi.
 *
 * Noto'g'ri format yoki mavjud bo'lmagan sana (masalan 2026-02-30) —
 * `null`.
 */
export function parseAssignmentDueDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const startOfDayUtc = Date.UTC(year, month - 1, day);
  const check = new Date(startOfDayUtc);
  // `Date.UTC` 30-fevralni jimgina 2-martga aylantiradi — shu tutib qoladi.
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return new Date(startOfDayUtc + DAY_MS - 1 - OFFSET_MS);
}

/**
 * Muddat qabul qilinadimi: bugundan (bugun ham mumkin) to
 * `ASSIGNMENT_MAX_DAYS_AHEAD` kungacha. Xato bo'lsa — sababi.
 */
export function validateAssignmentDueAt(dueAt: Date, now: Date = new Date()): string | null {
  const days = uzDayNumber(dueAt) - uzDayNumber(now);
  if (days < 0) return "Muddat o'tgan kun bo'lishi mumkin emas";
  if (days > ASSIGNMENT_MAX_DAYS_AHEAD) {
    return `Muddat ${ASSIGNMENT_MAX_DAYS_AHEAD} kundan uzoq bo'lmasligi kerak`;
  }
  return null;
}

export function isAssignmentOverdue(dueAt: Date, now: Date = new Date()): boolean {
  return dueAt.getTime() < now.getTime();
}

/**
 * Vazifaning bir qatorlik nomi: "2 ta imtihon" yoki
 * "3 ta mashq · Yo'l belgilari, Ustunlik huquqi".
 *
 * Ustoz, direktor va o'quvchi AYNI matnni ko'radi — bir-biriga "o'sha
 * vazifa" deb gapirganda so'zlar mos kelishi uchun u shu yerda turadi.
 */
export function describeAssignment(
  kind: AssignmentKind,
  targetCount: number,
  topicNames: string[]
): string {
  if (kind === "EXAM") return `${targetCount} ta imtihon`;
  const topics = topicNames.length > 0 ? ` · ${topicNames.join(", ")}` : "";
  return `${targetCount} ta mashq${topics}`;
}

/** Muddat yonidagi belgi: "Bugun", "3 kun qoldi", "Muddati o'tdi". */
export function describeAssignmentDue(
  dueAt: Date,
  now: Date = new Date()
): { label: string; variant: BadgeVariant } {
  if (isAssignmentOverdue(dueAt, now)) return { label: "Muddati o'tdi", variant: "danger" };
  const days = uzDayNumber(dueAt) - uzDayNumber(now);
  if (days === 0) return { label: "Bugun", variant: "warning" };
  if (days === 1) return { label: "Ertaga", variant: "warning" };
  return { label: `${days} kun qoldi`, variant: "neutral" };
}
