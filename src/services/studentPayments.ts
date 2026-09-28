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
  MAX_TEXT_LENGTH,
  type StudentPaymentMonths,
} from "@/lib/payments";
import { deleteReceipt, saveReceipt } from "@/lib/receiptStorage";
import { formatAmountUzs } from "@/lib/format";
import { createNotifications } from "@/services/notifications";
import { StudentPaymentError } from "@/services/studentPaymentError";
import {
  priceFor,
  settingsSelect,
  toSettings,
} from "@/services/studentPaymentSettings";
import {
  extendStudent,
  lockStudent,
  notifyPaymentConfirmed,
} from "@/services/studentAccessState";

/**
 * O'quvchi TO'LOVI: chek yuborish, naqd qayd etish, tasdiqlash/rad etish
 * va ro'yxatlar.
 *
 * Sozlamalar `studentPaymentSettings.ts` da, kirish holati
 * `studentAccessState.ts` da (2026-09-27 da ajratilgan). Bu fayl —
 * modulning ommaviy kirish nuqtasi: ikkalasini qayta eksport qiladi,
 * shuning uchun chaqiruvchi fayllarning birortasi o'zgarmadi.
 */

export { StudentPaymentError } from "@/services/studentPaymentError";
export {
  type StudentPaymentSettings,
  getStudentPaymentSettings,
  updateStudentPaymentSettings,
} from "@/services/studentPaymentSettings";
// `getStudentAccessMap` SHU faylda aniqlangan (ro'yxatlar bo'limida) —
// u bir nechta o'quvchining holatini bitta so'rovda oladi.
export { getStudentAccessForUser } from "@/services/studentAccessState";

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
      name: true,
      organizationId: true,
      // `receptionHandlesPayments` bildirishnoma kimga ketishini
      // hal qiladi (pastga qara) — shu sabab to'lov sozlamalari bilan
      // birga, bitta so'rovda olinadi.
      organization: {
        select: { ...settingsSelect, receptionHandlesPayments: true },
      },
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
      // Chekni ko'rib chiqa oladigan HAMMAGA: tashkilotning barcha faol
      // direktorlari, va "Qabulxona pul bilan ishlaydi" kaliti yoqilgan
      // bo'lsa qabulxona xodimlari ham (`canReviewStudentPayments`).
      //
      // Kalit shu yerda bir marta o'qiladi: chek kelganda qabulxona pul
      // bilan ishlamasa, unga xabar bormaydi — ochib ham hech narsa
      // qila olmaydigan bildirishnoma faqat xalaqit beradi.
      const recipients = await tx.user.findMany({
        where: {
          organizationId: student.organizationId!,
          isActive: true,
          role: org.receptionHandlesPayments
            ? { in: ["DIRECTOR", "RECEPTION"] }
            : "DIRECTOR",
        },
        select: { id: true, role: true },
      });
      await createNotifications(
        tx,
        recipients.map((r) => ({
          userId: r.id,
          type: "PAYMENT_SUBMITTED" as const,
          title: `Yangi chek: ${student.name}`,
          body: `${input.months} oy · ${formatAmountUzs(amount)}`,
          // Havola qabul qiluvchining o'z paneliga — qabulxona
          // `/director/tolovlar` ga kira olmaydi (proxy uni o'z
          // paneliga qaytarib yuborardi).
          link: r.role === "RECEPTION" ? "/qabulxona/tolovlar" : "/director/tolovlar",
        }))
      );
    });
  } catch (error) {
    await deleteReceipt(saved.key);
    throw error;
  }
}

/**
 * Naqd to'lov qayd etiladi — darhol tasdiqlangan, chekisiz.
 * Kim qayd eta olishini `canReviewStudentPayments` hal qiladi.
 */
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
    const paidUntil = await extendStudent(tx, input.studentId, input.months);
    await notifyPaymentConfirmed(tx, {
      studentId: input.studentId,
      months: input.months,
      paidUntil,
      method: "CASH",
    });
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
    const paidUntil = await extendStudent(tx, payment.studentId, payment.months);
    await notifyPaymentConfirmed(tx, {
      studentId: payment.studentId,
      months: payment.months,
      paidUntil,
      method: "CARD",
    });
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

  const payment = await prisma.studentPayment.findUnique({
    where: { id: input.paymentId },
    select: { studentId: true },
  });
  if (!payment) throw new StudentPaymentError("To'lov topilmadi", 404);

  await prisma.$transaction(async (tx) => {
    await closePending(tx, input.paymentId, {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedById: input.reviewerId,
      reviewNote: reason,
    });
    await createNotifications(tx, [
      {
        userId: payment.studentId,
        type: "PAYMENT_REJECTED",
        title: "Chekingiz rad etildi",
        body: `Sabab: ${reason} · Chekni qayta yuborishingiz mumkin`,
        link: "/student/tolov",
      },
    ]);
  });
}

// ---------------------------------------------------------------------------
// Ro'yxatlar
// ---------------------------------------------------------------------------

/** Direktor va qabulxona uchun — ko'rib chiqilganlar tarixi. */
/**
 * Ko'rib chiqilgan to'lovlar — qidiruv va holat filtri bilan.
 *
 * Nega kerak bo'lib qoldi: bu ro'yxat oxirgi 30 tasini ko'rsatardi va
 * boshqa hech qanday yo'l yo'q edi. Direktor "Alisher to'laganmi?"
 * degan savolga javob topolmasdi — barcha boshqa jurnalda qidiruv
 * bor, bu yerda esa yo'q edi. 30 tadan eski to'lov esa umuman
 * ko'rinmasdi.
 *
 * Qidiruv o'quvchining ISMI bo'yicha: direktor to'lovni odam orqali
 * qidiradi, summa yoki sana orqali emas.
 */
export async function listReviewedStudentPayments(
  organizationId: string,
  options: { limit?: number; search?: string; status?: "CONFIRMED" | "REJECTED" } = {}
): Promise<StudentPaymentRow[]> {
  const search = options.search?.trim() ?? "";
  const rows = await prisma.studentPayment.findMany({
    where: {
      organizationId,
      status: options.status ?? { not: "PENDING" },
      ...(search
        ? { student: { name: { contains: search, mode: "insensitive" as const } } }
        : {}),
    },
    select: rowSelect,
    orderBy: { createdAt: "desc" },
    take: options.limit ?? 30,
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

/** Direktor va qabulxona uchun — tasdiq kutayotganlar (eng eskisi birinchi). */
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
