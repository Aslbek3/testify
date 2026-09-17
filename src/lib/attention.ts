import { EXAM_PASS_PERCENT } from "@/lib/examRules";

/**
 * "Diqqat talab qiladi" qoidalari — ustoz guruh sahifasini ochganda
 * birinchi ko'radigan ro'yxat.
 *
 * Nega kerak: panel o'rtacha ballni ko'rsatadi, lekin ustozning savoli
 * boshqa — "bugun kimga e'tibor berishim kerak?". O'rtacha ball bu savolga
 * javob bermaydi: guruh o'rtachasi 78% bo'lishi va shu paytda ikkita
 * o'quvchi uch haftadan beri kirmagan bo'lishi mumkin.
 *
 * Sof funksiya: Prisma yo'q. Chegaralar bitta joyda — ustoz va direktor
 * ekranlari bir xil qoidaga tayanadi.
 */

/** Shu kundan ko'p vaqt faollik bo'lmasa — "yo'qolgan" o'quvchi. */
export const INACTIVE_DAYS = 14;

export type AttentionReason = "inactive" | "no-exam" | "low-score";

export const ATTENTION_LABEL: Record<AttentionReason, string> = {
  inactive: "Faollik yo'q",
  "no-exam": "Imtihon topshirmagan",
  "low-score": "Ball past",
};

export type AttentionItem = {
  studentId: string;
  name: string;
  reason: AttentionReason;
  detail: string;
};

type RosterLike = {
  studentId: string;
  name: string;
  isActive: boolean;
  examAttemptCount: number;
  practiceAttemptCount: number;
  averageScore: number | null;
  lastActivityAt: Date | null;
};

function daysSince(date: Date, now: Date): number {
  return Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Bitta o'quvchi uchun eng muhim sabab (yoki `null` — hammasi joyida).
 *
 * Tartib ataylab shunday: umuman kirmayotgan o'quvchi birinchi muammo —
 * uning ballini muhokama qilishdan avval uni qaytarish kerak.
 *
 * Bloklangan hisob bu ro'yxatga KIRMAYDI: u o'quv muammosi emas, ma'muriy
 * qaror va u allaqachon jadvalda ko'rinib turadi.
 */
export function attentionFor(entry: RosterLike, now: Date = new Date()): AttentionItem | null {
  if (!entry.isActive) return null;

  const base = { studentId: entry.studentId, name: entry.name };

  if (entry.lastActivityAt === null) {
    return { ...base, reason: "inactive", detail: "Hali test boshlamagan" };
  }
  const idleDays = daysSince(entry.lastActivityAt, now);
  if (idleDays >= INACTIVE_DAYS) {
    return { ...base, reason: "inactive", detail: `${idleDays} kundan beri kirmagan` };
  }
  if (entry.examAttemptCount === 0) {
    return {
      ...base,
      reason: "no-exam",
      detail:
        entry.practiceAttemptCount > 0
          ? `${entry.practiceAttemptCount} ta mashq, imtihon yo'q`
          : "Imtihon topshirmagan",
    };
  }
  if (entry.averageScore !== null && entry.averageScore < EXAM_PASS_PERCENT) {
    return {
      ...base,
      reason: "low-score",
      detail: `O'rtacha ${entry.averageScore}% — o'tish uchun ${EXAM_PASS_PERCENT}% kerak`,
    };
  }
  return null;
}

/** Butun guruh bo'yicha — sabab muhimligi, so'ng ism bo'yicha tartiblangan. */
export function attentionList(roster: RosterLike[], now: Date = new Date()): AttentionItem[] {
  const order: AttentionReason[] = ["inactive", "no-exam", "low-score"];
  return roster
    .map((entry) => attentionFor(entry, now))
    .filter((item): item is AttentionItem => item !== null)
    .sort(
      (a, b) =>
        order.indexOf(a.reason) - order.indexOf(b.reason) || a.name.localeCompare(b.name)
    );
}
