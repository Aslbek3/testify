import { cache } from "react";
import type { PaymentStatus, Prisma, StudentPaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { extendSubscription } from "@/lib/subscription";
import {
  getCoveredUntil,
  getStudentAccess,
  type StudentAccess,
  type StudentAccessInput,
} from "@/lib/studentAccess";
import {
  MAX_RECEIPT_BYTES,
  MAX_STUDENT_PRICE,
  MAX_TEXT_LENGTH,
  MAX_TRIAL_DAYS,
  MIN_STUDENT_PRICE,
  MIN_TRIAL_DAYS,
  type StudentPaymentMonths,
} from "@/lib/payments";
import { deleteReceipt, saveReceipt } from "@/lib/receiptStorage";

export class StudentPaymentError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

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

const settingsSelect = {
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

function toSettings(org: RawSettings): StudentPaymentSettings {
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
function priceFor(settings: Pick<RawSettings, "priceOneMonth" | "priceSixMonths">, months: StudentPaymentMonths) {
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

// ---------------------------------------------------------------------------
// Kirish holati
// ---------------------------------------------------------------------------

/**
 * O'quvchining to'lov bo'yicha kirish holati.
 *
 * `cache()` — bitta so'rov ichida ham layout, ham sahifa chaqiradi;
 * baza so'rovi ikkilanmaydi. O'quvchi bo'lmagan foydalanuvchi uchun
 * `free` (ular to'lov sababli hech qachon cheklanmaydi).
 */
export const getStudentAccessForUser = cache(async function getStudentAccessForUser(
  userId: string
): Promise<StudentAccess> {
  const input = await loadAccessInput(prisma, userId);
  return input ? getStudentAccess(input) : { kind: "free" };
});

type Db = Prisma.TransactionClient | typeof prisma;

async function loadAccessInput(db: Db, userId: string): Promise<StudentAccessInput | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      createdAt: true,
      studentProfile: { select: { paidUntil: true } },
      organization: { select: { studentPaymentsEnabledAt: true, trialDays: true } },
    },
  });
  if (!user || user.role !== "STUDENT" || !user.studentProfile || !user.organization) {
    return null;
  }
  return {
    enabledAt: user.organization.studentPaymentsEnabledAt,
    trialDays: user.organization.trialDays,
    studentCreatedAt: user.createdAt,
    paidUntil: user.studentProfile.paidUntil,
  };
}

/**
 * Bir o'quvchining to'lov yozuvlari ustidagi amallarni ketma-ket qiladi.
 *
 * Nega kerak: "kutayotgan to'lov bormi" tekshiruvi va yangi yozuv
 * yaratish orasida, yoki `paidUntil` ni o'qib, uzaytirib yozish orasida
 * boshqa so'rov suqilib kirsa — ikkita kutayotgan xabar paydo bo'lardi
 * yoki bitta uzaytirish yo'qolardi (masalan direktor naqd to'lovni
 * belgilayotgan paytda karta chekini ham tasdiqlasa). `FOR UPDATE`
 * o'quvchi profili qatorini tranzaksiya oxirigacha band qiladi.
 */
async function lockStudent(tx: Prisma.TransactionClient, studentId: string) {
  await tx.$queryRaw`SELECT id FROM "StudentProfile" WHERE "userId" = ${studentId} FOR UPDATE`;
}

/** Muddatni uzaytiradi — faqat `lockStudent` dan keyin, tranzaksiya ichida. */
async function extendStudent(
  tx: Prisma.TransactionClient,
  studentId: string,
  months: number
): Promise<void> {
  const input = await loadAccessInput(tx, studentId);
  if (!input) throw new StudentPaymentError("O'quvchi topilmadi", 404);
  await tx.studentProfile.update({
    where: { userId: studentId },
    data: { paidUntil: extendSubscription(getCoveredUntil(input), months) },
  });
}

// ---------------------------------------------------------------------------
// O'quvchi to'lovi
// ---------------------------------------------------------------------------

export type StudentPaymentRow = {
  id: string;
  studentId: string;
  studentName: string;
  groupName: string | null;
  amount: number;
  months: number;
  method: StudentPaymentMethod;
  status: PaymentStatus;
  hasReceipt: boolean;
  receiptMime: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  reviewedByName: string | null;
  reviewNote: string | null;
};

const rowSelect = {
  id: true,
  studentId: true,
  amount: true,
  months: true,
  method: true,
  status: true,
  receiptKey: true,
  receiptMime: true,
  createdAt: true,
  reviewedAt: true,
  reviewNote: true,
  student: {
    select: {
      name: true,
      studentProfile: { select: { group: { select: { name: true } } } },
    },
  },
  reviewedBy: { select: { name: true } },
} as const;

type RawRow = {
  id: string;
  studentId: string;
  amount: number;
  months: number;
  method: StudentPaymentMethod;
  status: PaymentStatus;
  receiptKey: string | null;
  receiptMime: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  reviewNote: string | null;
  student: { name: string; studentProfile: { group: { name: string } } | null };
  reviewedBy: { name: string } | null;
};

function toRow(p: RawRow): StudentPaymentRow {
  return {
    id: p.id,
    studentId: p.studentId,
    studentName: p.student.name,
    groupName: p.student.studentProfile?.group.name ?? null,
    amount: p.amount,
    months: p.months,
    method: p.method,
    status: p.status,
    // Kalitning o'zi klientga BERILMAYDI — u faqat serverda faylni topish
    // uchun. Klient chekni to'lov ID'si orqali, ruxsat tekshiriladigan
    // endpoint'dan so'raydi.
    hasReceipt: p.receiptKey !== null,
    receiptMime: p.receiptMime,
    createdAt: p.createdAt,
    reviewedAt: p.reviewedAt,
    reviewedByName: p.reviewedBy?.name ?? null,
    reviewNote: p.reviewNote,
  };
}

/**
 * O'quvchi chek bilan to'lov xabarini yuboradi.
 *
 * Summa o'quvchidan OLINMAYDI — avtomaktab narxidan hisoblanadi. Aks
 * holda o'quvchi 1 oylik narxni yozib, 6 oy tanlab yuborishi mumkin edi.
 */
export async function submitStudentPayment(input: {
  studentId: string;
  months: StudentPaymentMonths;
  receipt: Uint8Array;
}): Promise<void> {
  if (input.receipt.byteLength === 0) {
    throw new StudentPaymentError("Chek fayli bo'sh");
  }
  if (input.receipt.byteLength > MAX_RECEIPT_BYTES) {
    throw new StudentPaymentError("Chek hajmi 5 MB dan oshmasligi kerak", 413);
  }

  const student = await prisma.user.findUnique({
    where: { id: input.studentId },
    select: {
      organizationId: true,
      organization: { select: settingsSelect },
    },
  });
  const org = student?.organization;
  if (!student?.organizationId || !org) {
    throw new StudentPaymentError("O'quvchi topilmadi", 404);
  }
  if (!org.studentPaymentsEnabledAt) {
    throw new StudentPaymentError(
      "Avtomaktabingiz to'lovni tizim orqali qabul qilmaydi",
      409
    );
  }
  const amount = priceFor(org, input.months);
  if (!amount) {
    throw new StudentPaymentError("Bu muddat uchun narx belgilanmagan", 409);
  }

  // Fayl avval yoziladi (tranzaksiyadan tashqarida — disk operatsiyasi
  // bazani band qilib turmasin), bazaga yozilmasa o'chiriladi.
  const saved = await saveReceipt(input.receipt);
  if (!saved) {
    throw new StudentPaymentError("Chek faqat rasm (JPG, PNG) yoki PDF bo'lishi mumkin");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await lockStudent(tx, input.studentId);
      // Bir vaqtda bitta kutayotgan xabar: direktor qaysi birini
      // tasdiqlashni bilmay qolmasin va tasodifan ikkalasini tasdiqlab
      // muddatni ikki barobar uzaytirib yubormasin.
      const pending = await tx.studentPayment.count({
        where: { studentId: input.studentId, status: "PENDING" },
      });
      if (pending > 0) {
        throw new StudentPaymentError(
          "Sizda tasdiq kutayotgan to'lov bor. Direktor uni ko'rib chiqmaguncha yangisini yubora olmaysiz.",
          409
        );
      }
      await tx.studentPayment.create({
        data: {
          organizationId: student.organizationId!,
          studentId: input.studentId,
          amount,
          months: input.months,
          method: "CARD",
          receiptKey: saved.key,
          receiptMime: saved.mime,
        },
      });
    });
  } catch (error) {
    await deleteReceipt(saved.key);
    throw error;
  }
}

/** Direktor naqd to'lovni belgilaydi — darhol tasdiqlangan, chekisiz. */
export async function recordCashPayment(input: {
  organizationId: string;
  studentId: string;
  months: StudentPaymentMonths;
  reviewerId: string;
}): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: settingsSelect,
  });
  if (!org) throw new StudentPaymentError("Tashkilot topilmadi", 404);
  if (!org.studentPaymentsEnabledAt) {
    throw new StudentPaymentError("Avval to'lov sozlamalarida o'quvchi to'lovini yoqing", 409);
  }
  const amount = priceFor(org, input.months);
  if (!amount) throw new StudentPaymentError("Bu muddat uchun narx belgilanmagan", 409);

  await prisma.$transaction(async (tx) => {
    await lockStudent(tx, input.studentId);
    await tx.studentPayment.create({
      data: {
        organizationId: input.organizationId,
        studentId: input.studentId,
        amount,
        months: input.months,
        method: "CASH",
        status: "CONFIRMED",
        reviewedAt: new Date(),
        reviewedById: input.reviewerId,
      },
    });
    await extendStudent(tx, input.studentId, input.months);
  });
}

/** Ruxsat tekshiruvi uchun — kimga tegishli ekani. */
export async function getStudentPaymentRef(paymentId: string): Promise<{
  organizationId: string;
  studentId: string;
  receiptKey: string | null;
  receiptMime: string | null;
} | null> {
  return prisma.studentPayment.findUnique({
    where: { id: paymentId },
    select: { organizationId: true, studentId: true, receiptKey: true, receiptMime: true },
  });
}

/**
 * Holatni PENDING'dan boshqasiga o'tkazadi — faqat hali PENDING bo'lsa.
 *
 * Shart `WHERE` ichida: o'qib tekshirib, keyin yozish emas. Ikki so'rov
 * bir vaqtda kelsa (direktor tugmani ikki marta bosdi yoki ikkita
 * yorliqda ochib qo'ydi) ikkalasi ham "hali PENDING" deb o'qib, muddatni
 * ikki marta uzaytirardi. Bu yerda esa faqat bittasi 1 qator o'zgartiradi.
 */
async function closePending(
  tx: Prisma.TransactionClient,
  paymentId: string,
  data: Prisma.StudentPaymentUncheckedUpdateManyInput
) {
  const { count } = await tx.studentPayment.updateMany({
    where: { id: paymentId, status: "PENDING" },
    data,
  });
  if (count !== 1) {
    throw new StudentPaymentError("Bu to'lov allaqachon ko'rib chiqilgan", 409);
  }
}

export async function confirmStudentPayment(input: {
  paymentId: string;
  reviewerId: string;
}): Promise<void> {
  const payment = await prisma.studentPayment.findUnique({
    where: { id: input.paymentId },
    select: { studentId: true, months: true },
  });
  if (!payment) throw new StudentPaymentError("To'lov topilmadi", 404);

  await prisma.$transaction(async (tx) => {
    await lockStudent(tx, payment.studentId);
    await closePending(tx, input.paymentId, {
      status: "CONFIRMED",
      reviewedAt: new Date(),
      reviewedById: input.reviewerId,
    });
    await extendStudent(tx, payment.studentId, payment.months);
  });
}

/** Rad etish — sabab majburiy (o'quvchi nima noto'g'ri ekanini bilishi kerak). */
export async function rejectStudentPayment(input: {
  paymentId: string;
  reviewerId: string;
  reason: string;
}): Promise<void> {
  const reason = input.reason.trim();
  if (!reason) throw new StudentPaymentError("Rad etish sababi ko'rsatilishi shart");
  if (reason.length > MAX_TEXT_LENGTH) {
    throw new StudentPaymentError(`Sabab ${MAX_TEXT_LENGTH} belgidan oshmasligi kerak`);
  }

  await prisma.$transaction(async (tx) => {
    await closePending(tx, input.paymentId, {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedById: input.reviewerId,
      reviewNote: reason,
    });
  });
}

// ---------------------------------------------------------------------------
// Ro'yxatlar
// ---------------------------------------------------------------------------

/** Direktor uchun — ko'rib chiqilganlar tarixi. */
export async function listReviewedStudentPayments(
  organizationId: string,
  limit = 30
): Promise<StudentPaymentRow[]> {
  const rows = await prisma.studentPayment.findMany({
    where: { organizationId, status: { not: "PENDING" } },
    select: rowSelect,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(toRow);
}

/** O'quvchining o'z to'lovlari. */
export async function listPaymentsForStudent(
  studentId: string,
  limit = 20
): Promise<StudentPaymentRow[]> {
  const rows = await prisma.studentPayment.findMany({
    where: { studentId },
    select: rowSelect,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(toRow);
}

/**
 * Menyudagi "To'lovlar (N)" uchun. `cache()` — layout va sahifa bir
 * so'rovda ikkalasi chaqirsa ham bitta so'rov.
 */
export const countPendingStudentPayments = cache(async function countPendingStudentPayments(
  organizationId: string
): Promise<number> {
  return prisma.studentPayment.count({ where: { organizationId, status: "PENDING" } });
});

/** Bir nechta o'quvchi uchun kirish ma'lumotlari — bitta so'rovda. */
async function loadAccessInputs(
  studentIds: string[]
): Promise<Map<string, StudentAccessInput>> {
  if (studentIds.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: studentIds }, role: "STUDENT" },
    select: {
      id: true,
      createdAt: true,
      studentProfile: { select: { paidUntil: true } },
      organization: { select: { studentPaymentsEnabledAt: true, trialDays: true } },
    },
  });
  const result = new Map<string, StudentAccessInput>();
  for (const u of users) {
    if (!u.organization) continue;
    result.set(u.id, {
      enabledAt: u.organization.studentPaymentsEnabledAt,
      trialDays: u.organization.trialDays,
      studentCreatedAt: u.createdAt,
      paidUntil: u.studentProfile?.paidUntil ?? null,
    });
  }
  return result;
}

/**
 * Bir nechta o'quvchining kirish holati — ro'yxatlardagi "To'lov"
 * ustuni uchun. Har o'quvchi uchun alohida so'rov emas, bitta so'rov.
 */
export async function getStudentAccessMap(
  studentIds: string[]
): Promise<Map<string, StudentAccess>> {
  const inputs = await loadAccessInputs(studentIds);
  const now = new Date();
  return new Map(
    studentIds.map((id) => {
      const input = inputs.get(id);
      return [id, input ? getStudentAccess(input, now) : { kind: "free" as const }];
    })
  );
}

export type PendingStudentPaymentReview = StudentPaymentRow & {
  /**
   * Tasdiqlansa o'quvchi shu sanagacha to'langan bo'ladi.
   *
   * Tasdiqlashda ishlatiladigan formulaning O'ZI bilan hisoblanadi
   * (`getCoveredUntil` + `extendSubscription`) — ekrandagi sana bilan
   * bazaga yoziladigan sana ajralib qolmasin.
   */
  nextPaidUntil: Date;
};

/** Direktor uchun — tasdiq kutayotganlar (eng eskisi birinchi). */
export async function listPendingStudentPayments(
  organizationId: string
): Promise<PendingStudentPaymentReview[]> {
  const rows = (
    await prisma.studentPayment.findMany({
      where: { organizationId, status: "PENDING" },
      select: rowSelect,
      orderBy: { createdAt: "asc" },
    })
  ).map(toRow);

  const inputs = await loadAccessInputs([...new Set(rows.map((r) => r.studentId))]);
  return rows.map((row) => {
    const input = inputs.get(row.studentId);
    return {
      ...row,
      nextPaidUntil: extendSubscription(input ? getCoveredUntil(input) : null, row.months),
    };
  });
}

/** O'quvchining to'lov sahifasi uchun — sozlamalarning faqat to'lashga kerakli qismi. */
export async function getPaymentInstructionsForStudent(studentId: string): Promise<{
  enabled: boolean;
  cardNumber: string | null;
  cardHolder: string | null;
  priceOneMonth: number | null;
  priceSixMonths: number | null;
  hasPending: boolean;
} | null> {
  const [user, pending] = await Promise.all([
    prisma.user.findUnique({
      where: { id: studentId },
      select: { organization: { select: settingsSelect } },
    }),
    prisma.studentPayment.count({ where: { studentId, status: "PENDING" } }),
  ]);
  if (!user?.organization) return null;
  const s = toSettings(user.organization);
  return {
    enabled: s.enabled,
    cardNumber: s.cardNumber,
    cardHolder: s.cardHolder,
    priceOneMonth: s.priceOneMonth,
    priceSixMonths: s.priceSixMonths,
    hasPending: pending > 0,
  };
}
