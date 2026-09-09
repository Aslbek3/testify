import { cache } from "react";
import type { Plan, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { extendSubscription } from "@/lib/subscription";
import {
  ALLOWED_MONTHS,
  MAX_AMOUNT,
  MAX_TEXT_LENGTH,
  MIN_AMOUNT,
} from "@/lib/payments";

export class PaymentError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Sof konstantalar `lib/payments.ts` da — ular client komponentlarga ham
 * kerak, service esa Prisma'ni import qilgani uchun u yerdan import
 * qilinmaydi. Bu yerda qayta eksport qilinadi: server tarafdagi kod
 * hammasini bitta joydan olishda davom etadi.
 */
export {
  ALLOWED_MONTHS,
  MAX_TEXT_LENGTH,
} from "@/lib/payments";

export type PaymentRow = {
  id: string;
  organizationId: string;
  organizationName: string;
  amount: number;
  months: number;
  plan: Plan;
  status: PaymentStatus;
  reference: string | null;
  note: string | null;
  createdAt: Date;
  /**
   * Tashkilotning HOZIRGI obuna muddati.
   *
   * Owner "tasdiqlansa qaysi sanagacha uzayadi" ni ko'rsatishi uchun kerak.
   * Bu yerda qaytarilmasa, UI har qator uchun alohida so'rov yuborishga
   * majbur bo'lardi — holbuki u allaqachon shu JOIN ichida bor.
   */
  organizationSubscriptionEndsAt: Date | null;
  submittedByName: string;
  reviewedAt: Date | null;
  reviewedByName: string | null;
  reviewNote: string | null;
};

const paymentSelect = {
  id: true,
  organizationId: true,
  amount: true,
  months: true,
  plan: true,
  status: true,
  reference: true,
  note: true,
  createdAt: true,
  reviewedAt: true,
  reviewNote: true,
  organization: { select: { name: true, subscriptionEndsAt: true } },
  submittedBy: { select: { name: true } },
  reviewedBy: { select: { name: true } },
} as const;

type RawPayment = {
  id: string;
  organizationId: string;
  amount: number;
  months: number;
  plan: Plan;
  status: PaymentStatus;
  reference: string | null;
  note: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  reviewNote: string | null;
  organization: { name: string; subscriptionEndsAt: Date | null };
  submittedBy: { name: string };
  reviewedBy: { name: string } | null;
};

function toRow(p: RawPayment): PaymentRow {
  return {
    id: p.id,
    organizationId: p.organizationId,
    organizationName: p.organization.name,
    amount: p.amount,
    months: p.months,
    plan: p.plan,
    status: p.status,
    reference: p.reference,
    note: p.note,
    createdAt: p.createdAt,
    organizationSubscriptionEndsAt: p.organization.subscriptionEndsAt,
    submittedByName: p.submittedBy.name,
    reviewedAt: p.reviewedAt,
    reviewedByName: p.reviewedBy?.name ?? null,
    reviewNote: p.reviewNote,
  };
}

function normalizeText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_TEXT_LENGTH) {
    throw new PaymentError(`Matn ${MAX_TEXT_LENGTH} belgidan oshmasligi kerak`);
  }
  return trimmed;
}

/**
 * Direktor to'lov haqida xabar beradi.
 *
 * Bu TO'LOVNI AMALGA OSHIRMAYDI — u allaqachon bank yoki to'lov tizimi
 * orqali qilingan. Bu shunchaki "men to'ladim, mana raqami" degan xabar:
 * owner uni ko'chirma bilan solishtirib tasdiqlaydi. Avtomatik to'lov
 * qo'shilganda shu yozuvni direktor emas, to'lov tizimi yaratadi.
 */
export async function submitPayment(input: {
  organizationId: string;
  submittedById: string;
  amount: number;
  months: number;
  plan: Plan;
  reference?: string | null;
  note?: string | null;
}): Promise<void> {
  if (!Number.isInteger(input.amount) || input.amount < MIN_AMOUNT || input.amount > MAX_AMOUNT) {
    throw new PaymentError("To'lov summasi noto'g'ri");
  }
  if (!ALLOWED_MONTHS.includes(input.months as (typeof ALLOWED_MONTHS)[number])) {
    throw new PaymentError(
      `Muddat ${ALLOWED_MONTHS.join(", ")} oydan biri bo'lishi kerak`
    );
  }

  // Bir vaqtning o'zida bir nechta kutilayotgan xabar bo'lmasin: owner
  // qaysi birini tasdiqlashni bilmay qoladi va tasodifan ikkalasini
  // tasdiqlab, obunani ikki barobar uzaytirib yuborishi mumkin.
  const pending = await prisma.payment.count({
    where: { organizationId: input.organizationId, status: "PENDING" },
  });
  if (pending > 0) {
    throw new PaymentError(
      "Sizda tasdiq kutayotgan to'lov xabari allaqachon bor. Owner uni ko'rib chiqmaguncha yangisini yubora olmaysiz.",
      409
    );
  }

  await prisma.payment.create({
    data: {
      organizationId: input.organizationId,
      submittedById: input.submittedById,
      amount: input.amount,
      months: input.months,
      plan: input.plan,
      reference: normalizeText(input.reference),
      note: normalizeText(input.note),
    },
  });
}

/** Owner uchun — tasdiq kutayotgan to'lovlar (eng eskisi birinchi). */
export async function listPendingPayments(): Promise<PaymentRow[]> {
  const rows = await prisma.payment.findMany({
    where: { status: "PENDING" },
    select: paymentSelect,
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toRow);
}

/**
 * Butun platforma bo'yicha to'lov tarixi — owner o'z panelida ko'radi.
 *
 * Nega kerak: tasdiqlangan yoki rad etilgan to'lov `listPendingPayments()`
 * dan chiqib ketadi va owner uchun izsiz yo'qolardi. Ya'ni "kim to'lagan,
 * men nimani tasdiqlaganman" degan savolga javob beradigan joy yo'q edi.
 */
export async function listRecentPayments(limit = 20): Promise<PaymentRow[]> {
  const rows = await prisma.payment.findMany({
    select: paymentSelect,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(toRow);
}

/** Bitta tashkilotning to'lov tarixi — direktor o'z panelida ko'radi. */
export async function listPaymentsForOrganization(
  organizationId: string,
  limit = 20
): Promise<PaymentRow[]> {
  const rows = await prisma.payment.findMany({
    where: { organizationId },
    select: paymentSelect,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(toRow);
}

/**
 * Owner to'lovni tasdiqlaydi — obuna uzayadi.
 *
 * Hammasi bitta tranzaksiyada: to'lov holati va tashkilot obunasi
 * ajralib qolmasligi kerak. Aks holda to'lov "tasdiqlangan" bo'lib,
 * obuna esa uzaymay qolishi mumkin edi.
 */
export async function confirmPayment(input: {
  paymentId: string;
  reviewedById: string;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: input.paymentId },
      select: {
        status: true,
        months: true,
        plan: true,
        organizationId: true,
        organization: { select: { subscriptionEndsAt: true } },
      },
    });
    if (!payment) throw new PaymentError("To'lov topilmadi", 404);

    // Ikki marta tasdiqlash obunani ikki barobar uzaytirib yuborardi —
    // masalan owner tugmani ikki marta bosganda yoki ikkita yorliqda
    // ochib qo'yganda.
    if (payment.status !== "PENDING") {
      throw new PaymentError("Bu to'lov allaqachon ko'rib chiqilgan", 409);
    }

    await tx.payment.update({
      where: { id: input.paymentId },
      data: {
        status: "CONFIRMED",
        reviewedAt: new Date(),
        reviewedById: input.reviewedById,
      },
    });

    await tx.organization.update({
      where: { id: payment.organizationId },
      data: {
        subscriptionEndsAt: extendSubscription(
          payment.organization.subscriptionEndsAt,
          payment.months
        ),
        // Tarif to'lovda ko'rsatilganiga o'tadi va tashkilot faollashadi —
        // to'lagan mijoz "muddati tugagan" holatida qolib ketmasin.
        plan: payment.plan,
        status: "ACTIVE",
      },
    });
  });
}

/** Owner to'lovni rad etadi — obunaga tegilmaydi. */
export async function rejectPayment(input: {
  paymentId: string;
  reviewedById: string;
  reason: string;
}): Promise<void> {
  const reason = normalizeText(input.reason);
  if (!reason) {
    throw new PaymentError("Rad etish sababi ko'rsatilishi shart");
  }

  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId },
    select: { status: true },
  });
  if (!payment) throw new PaymentError("To'lov topilmadi", 404);
  if (payment.status !== "PENDING") {
    throw new PaymentError("Bu to'lov allaqachon ko'rib chiqilgan", 409);
  }

  await prisma.payment.update({
    where: { id: input.paymentId },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedById: input.reviewedById,
      reviewNote: reason,
    },
  });
}

/**
 * Direktor paneli sarlavhasi uchun — obuna holati va kutilayotgan xabar.
 *
 * `cache()` bilan o'ralgan: bu funksiya bitta so'rov ichida ikki marta
 * chaqiriladi — `director/layout.tsx` (ogohlantirish banneri) va
 * `director/page.tsx` (obuna kartochkasi). React bir render davomida
 * bir xil argument uchun natijani qayta ishlatadi, ya'ni baza so'rovi
 * ikkilanmaydi. Kesh so'rov chegarasida tugaydi — eskirgan ma'lumot
 * ko'rsatilishi mumkin emas.
 */
export const getSubscriptionSummary = cache(async function getSubscriptionSummary(
  organizationId: string
): Promise<{
  status: "ACTIVE" | "TRIAL" | "EXPIRED";
  plan: Plan;
  subscriptionEndsAt: Date | null;
  hasPendingPayment: boolean;
}> {
  const [org, pending] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { status: true, plan: true, subscriptionEndsAt: true },
    }),
    prisma.payment.count({ where: { organizationId, status: "PENDING" } }),
  ]);
  if (!org) throw new PaymentError("Tashkilot topilmadi", 404);

  return {
    status: org.status,
    plan: org.plan,
    subscriptionEndsAt: org.subscriptionEndsAt,
    hasPendingPayment: pending > 0,
  };
});
