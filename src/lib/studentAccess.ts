import { SUBSCRIPTION_GRACE_DAYS } from "@/lib/subscription";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * O'quvchining test ishlashga kirishi — to'lov nuqtai nazaridan.
 *
 * SOF funksiyalar (bazaga murojaat yo'q): ham serverda (testni boshlash,
 * sahifa himoyasi), ham ekranda (holat yorlig'i) aynan bir xil qoida
 * ishlashi uchun. Qoida bitta joyda — aks holda direktor ro'yxatda
 * "to'langan" deb ko'rib, o'quvchi esa "yopiq" ekranni ko'rishi mumkin edi.
 */
export type StudentAccessInput = {
  /** Avtomaktab o'quvchi to'lovini yoqqan vaqt. `null` — o'chiq. */
  enabledAt: Date | null;
  trialDays: number;
  /** O'quvchi hisobi yaratilgan vaqt. */
  studentCreatedAt: Date;
  paidUntil: Date | null;
};

export type StudentAccess =
  /** Avtomaktab to'lovni tizim orqali qabul qilmaydi — hech narsa cheklanmaydi. */
  | { kind: "free" }
  /** Bepul sinov muddati. */
  | { kind: "trial"; endsAt: Date; daysLeft: number }
  /** To'langan muddat ichida. */
  | { kind: "paid"; paidUntil: Date }
  /** Muddat tugagan, imtiyoz kunlari davom etyapti — hali ochiq. */
  | { kind: "grace"; endedAt: Date; daysLeft: number }
  /** Yopiq: faqat to'lov va profil sahifalari ochiladi. */
  | { kind: "blocked"; endedAt: Date };

/**
 * Sinov qachon tugaydi.
 *
 * `max(createdAt, enabledAt)` dan hisoblanadi: avtomaktab to'lovni
 * yoqqan kunda allaqachon o'qib yurgan o'quvchilar ham to'liq sinov
 * muddatini oladi. Aks holda yoqilgan zahoti ularning hammasi birdaniga
 * yopilib qolardi — ro'yxatdan o'tganlariga sinovdan ko'p kun bo'lgan.
 */
export function getTrialEndsAt(input: StudentAccessInput): Date | null {
  if (!input.enabledAt) return null;
  const start = Math.max(input.studentCreatedAt.getTime(), input.enabledAt.getTime());
  return new Date(start + input.trialDays * DAY_MS);
}

/**
 * O'quvchi qachongacha "qoplangan" — sinov yoki to'lov, qaysi biri keyinroq.
 *
 * Tasdiqlangan to'lov muddati SHUNING ustiga qo'shiladi: sinov
 * davomida oldindan to'lagan o'quvchi qolgan bepul kunlarini yo'qotmaydi.
 */
export function getCoveredUntil(input: StudentAccessInput): Date | null {
  const trialEndsAt = getTrialEndsAt(input);
  if (!trialEndsAt) return null;
  if (input.paidUntil && input.paidUntil.getTime() > trialEndsAt.getTime()) {
    return input.paidUntil;
  }
  return trialEndsAt;
}

function daysUntil(target: number, now: number): number {
  // Yuqoriga yaxlitlanadi: bir necha soat qolganda ham "1 kun" — "0 kun"
  // hech narsa aytmaydi (`lib/subscription.ts` dagi bilan bir xil qoida).
  return Math.max(1, Math.ceil((target - now) / DAY_MS));
}

export function getStudentAccess(
  input: StudentAccessInput,
  now: Date = new Date()
): StudentAccess {
  const coveredUntil = getCoveredUntil(input);
  if (!coveredUntil) return { kind: "free" };

  const nowMs = now.getTime();
  const endMs = coveredUntil.getTime();

  if (nowMs <= endMs) {
    // To'langan muddat sinovdan keyinroq bo'lsa — "to'langan", aks holda
    // hali sinov davri (to'lov umuman bo'lmagan yoki sinov ichida qolgan).
    const paidBeyondTrial =
      input.paidUntil !== null && input.paidUntil.getTime() === endMs;
    return paidBeyondTrial
      ? { kind: "paid", paidUntil: coveredUntil }
      : { kind: "trial", endsAt: coveredUntil, daysLeft: daysUntil(endMs, nowMs) };
  }

  const graceEndMs = endMs + SUBSCRIPTION_GRACE_DAYS * DAY_MS;
  if (nowMs <= graceEndMs) {
    return { kind: "grace", endedAt: coveredUntil, daysLeft: daysUntil(graceEndMs, nowMs) };
  }
  return { kind: "blocked", endedAt: coveredUntil };
}
