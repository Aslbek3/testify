import { prisma } from "@/lib/prisma";
import {
  MAX_STUDENT_PRICE,
  MAX_TEXT_LENGTH,
  MAX_TRIAL_DAYS,
  MIN_STUDENT_PRICE,
  MIN_TRIAL_DAYS,
  type StudentPaymentMonths,
} from "@/lib/payments";
import { StudentPaymentError } from "@/services/studentPaymentError";

/**
 * O'quvchi to'lovining SOZLAMALARI — karta, narx, sinov kunlari.
 *
 * `studentPayments.ts` dan ajratilgan (2026-09-27): u 752 qatorga
 * yetgan va ichida uchta boshqa-boshqa ish bor edi. Sozlamalarni
 * faqat DIREKTOR o'zgartiradi va ular to'lovning o'zidan mustaqil —
 * chegarani fayl darajasida ko'rsatib qo'ygan ma'qul.
 *
 * Hammasi `studentPayments.ts` orqali qayta eksport qilinadi.
 */

// ---------------------------------------------------------------------------
// Sozlamalar (direktor)
// ---------------------------------------------------------------------------

export type StudentPaymentSettings = {
  enabled: boolean;
  enabledAt: Date | null;
  cardNumber: string | null;
  cardHolder: string | null;
  priceOneMonth: number | null;
  priceSixMonths: number | null;
  trialDays: number;
};

export const settingsSelect = {
  studentPaymentsEnabledAt: true,
  paymentCardNumber: true,
  paymentCardHolder: true,
  priceOneMonth: true,
  priceSixMonths: true,
  trialDays: true,
} as const;

type RawSettings = {
  studentPaymentsEnabledAt: Date | null;
  paymentCardNumber: string | null;
  paymentCardHolder: string | null;
  priceOneMonth: number | null;
  priceSixMonths: number | null;
  trialDays: number;
};

export function toSettings(org: RawSettings): StudentPaymentSettings {
  return {
    enabled: org.studentPaymentsEnabledAt !== null,
    enabledAt: org.studentPaymentsEnabledAt,
    cardNumber: org.paymentCardNumber,
    cardHolder: org.paymentCardHolder,
    priceOneMonth: org.priceOneMonth,
    priceSixMonths: org.priceSixMonths,
    trialDays: org.trialDays,
  };
}

export async function getStudentPaymentSettings(
  organizationId: string
): Promise<StudentPaymentSettings> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: settingsSelect,
  });
  if (!org) throw new StudentPaymentError("Tashkilot topilmadi", 404);
  return toSettings(org);
}

/** Tanlangan muddat narxi. Narx qo'yilmagan bo'lsa `null`. */
export function priceFor(settings: Pick<RawSettings, "priceOneMonth" | "priceSixMonths">, months: StudentPaymentMonths) {
  return months === 1 ? settings.priceOneMonth : settings.priceSixMonths;
}

/**
 * Karta raqami: probel va chiziqchalar olib tashlanadi, 16 ta raqam
 * bo'lishi shart (Uzcard, Humo, Visa, Mastercard — hammasi 16 xonali).
 */
function normalizeCardNumber(value: string): string | null {
  const digits = value.replace(/[\s-]/g, "");
  return /^\d{16}$/.test(digits) ? digits : null;
}

function validatePrice(value: number | null, label: string): number | null {
  if (value === null) return null;
  if (!Number.isInteger(value) || value < MIN_STUDENT_PRICE || value > MAX_STUDENT_PRICE) {
    throw new StudentPaymentError(`${label} narxi noto'g'ri`);
  }
  return value;
}

export async function updateStudentPaymentSettings(
  organizationId: string,
  input: {
    enabled: boolean;
    cardNumber: string;
    cardHolder: string;
    priceOneMonth: number | null;
    priceSixMonths: number | null;
    trialDays: number;
  }
): Promise<void> {
  const rawCard = input.cardNumber.trim();
  const cardNumber = rawCard ? normalizeCardNumber(rawCard) : null;
  if (rawCard && !cardNumber) {
    throw new StudentPaymentError("Karta raqami 16 ta raqamdan iborat bo'lishi kerak");
  }

  const cardHolder = input.cardHolder.trim() || null;
  if (cardHolder && cardHolder.length > MAX_TEXT_LENGTH) {
    throw new StudentPaymentError(`Karta egasi ${MAX_TEXT_LENGTH} belgidan oshmasligi kerak`);
  }

  const priceOneMonth = validatePrice(input.priceOneMonth, "1 oylik");
  const priceSixMonths = validatePrice(input.priceSixMonths, "6 oylik");

  if (
    !Number.isInteger(input.trialDays) ||
    input.trialDays < MIN_TRIAL_DAYS ||
    input.trialDays > MAX_TRIAL_DAYS
  ) {
    throw new StudentPaymentError(
      `Sinov muddati ${MIN_TRIAL_DAYS}–${MAX_TRIAL_DAYS} kun oralig'ida bo'lishi kerak`
    );
  }

  // Yoqish uchun hammasi to'liq bo'lishi shart: aks holda o'quvchi
  // to'lov sahifasida kartasiz yoki narxsiz qolib, to'lay olmay turib
  // bloklanib ketardi.
  if (input.enabled && (!cardNumber || !cardHolder || !priceOneMonth || !priceSixMonths)) {
    throw new StudentPaymentError(
      "To'lovni yoqish uchun karta raqami, karta egasi va ikkala narx kiritilishi shart"
    );
  }

  const current = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { studentPaymentsEnabledAt: true },
  });
  if (!current) throw new StudentPaymentError("Tashkilot topilmadi", 404);

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      paymentCardNumber: cardNumber,
      paymentCardHolder: cardHolder,
      priceOneMonth,
      priceSixMonths,
      trialDays: input.trialDays,
      // Yoqilgan sana faqat O'CHIQ → YOQIQ o'tishida yoziladi. Har
      // saqlashda yangilansa, direktor narxni tuzatgan sayin hamma
      // o'quvchining sinov muddati qaytadan boshlanib ketardi.
      studentPaymentsEnabledAt: input.enabled
        ? current.studentPaymentsEnabledAt ?? new Date()
        : null,
    },
  });
}

