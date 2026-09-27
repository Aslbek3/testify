import { cache } from "react";
import type { Prisma, StudentPaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getCoveredUntil,
  getStudentAccess,
  type StudentAccess,
  type StudentAccessInput,
} from "@/lib/studentAccess";
import { formatDate } from "@/lib/format";
import { extendSubscription } from "@/lib/subscription";
import { createNotifications } from "@/services/notifications";
import { StudentPaymentError } from "@/services/studentPaymentError";

/**
 * O'quvchining KIRISH HOLATI — to'lov muddati tugaganmi, sinov davri
 * ichidami, bepulmi.
 *
 * `studentPayments.ts` dan ajratilgan (2026-09-27). Bu yer "pul o'tdimi"
 * degan savolga emas, "o'quvchi hozir test ishlay oladimi" degan savolga
 * javob beradi — ikkisi bog'liq, lekin bir xil emas: bepul tashkilotda
 * birorta to'lov bo'lmasa ham kirish ochiq.
 */

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

export async function loadAccessInput(db: Db, userId: string): Promise<StudentAccessInput | null> {
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
export async function lockStudent(tx: Prisma.TransactionClient, studentId: string) {
  await tx.$queryRaw`SELECT id FROM "StudentProfile" WHERE "userId" = ${studentId} FOR UPDATE`;
}

/**
 * Muddatni uzaytiradi — faqat `lockStudent` dan keyin, tranzaksiya ichida.
 * Yangi muddatni qaytaradi (o'quvchiga bildirishnomada aytiladi).
 */
export async function extendStudent(
  tx: Prisma.TransactionClient,
  studentId: string,
  months: number
): Promise<Date> {
  const input = await loadAccessInput(tx, studentId);
  if (!input) throw new StudentPaymentError("O'quvchi topilmadi", 404);
  const paidUntil = extendSubscription(getCoveredUntil(input), months);
  await tx.studentProfile.update({
    where: { userId: studentId },
    data: { paidUntil },
  });
  return paidUntil;
}

/** O'quvchiga "to'lov tasdiqlandi" — karta va naqd uchun bir xil matn. */
export async function notifyPaymentConfirmed(
  tx: Prisma.TransactionClient,
  input: { studentId: string; months: number; paidUntil: Date; method: StudentPaymentMethod }
) {
  await createNotifications(tx, [
    {
      userId: input.studentId,
      type: "PAYMENT_CONFIRMED",
      title: input.method === "CASH" ? "Naqd to'lovingiz qayd etildi" : "To'lovingiz tasdiqlandi",
      body: `${input.months} oy · Testlar ${formatDate(input.paidUntil)} gacha ochiq`,
      link: "/student/tolov",
    },
  ]);
}

