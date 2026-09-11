import type { Plan, OrganizationStatus, PaymentStatus } from "@prisma/client";
import type { BadgeVariant } from "@/components/Badge";
import type { StudentAccess } from "@/lib/studentAccess";
import { formatDate } from "@/lib/format";

export const PLAN_LABEL: Record<Plan, string> = {
  START: "Start",
  STANDARD: "Standart",
  PRO: "Pro",
};

export const ORG_STATUS_LABEL: Record<OrganizationStatus, string> = {
  ACTIVE: "Faol",
  TRIAL: "Sinov muddati",
  EXPIRED: "Muddati tugagan",
};

export const ORG_STATUS_VARIANT: Record<OrganizationStatus, BadgeVariant> = {
  ACTIVE: "success",
  TRIAL: "warning",
  EXPIRED: "danger",
};

/**
 * To'lov xabarining holati. Direktor o'z tarixida, owner esa ko'rib
 * chiqish ro'yxatida AYNI shu yorliqlarni ko'radi — ikki tomon bir xil
 * so'z bilan gaplashishi uchun ular shu yerda, bitta joyda turadi.
 */
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Tasdiq kutmoqda",
  CONFIRMED: "Tasdiqlangan",
  REJECTED: "Rad etilgan",
};

export const PAYMENT_STATUS_VARIANT: Record<PaymentStatus, BadgeVariant> = {
  PENDING: "warning",
  CONFIRMED: "success",
  REJECTED: "danger",
};

/** To'lov usuli. */
export const STUDENT_PAYMENT_METHOD_LABEL: Record<"CARD" | "CASH", string> = {
  CARD: "Karta",
  CASH: "Naqd",
};

/**
 * O'quvchining to'lov holati — ro'yxatlardagi (direktor, ustoz) yorliq.
 *
 * Holatning O'ZI `lib/studentAccess.ts` da hisoblanadi; bu yerda faqat
 * uni qanday atash. Ikkalasi ajratilgan, chunki yorliq ekranga,
 * hisob esa kirish qoidasiga tegishli.
 */
export type StudentAccessLabel = {
  label: string;
  variant: BadgeVariant;
  detail: string | null;
};

export function describeStudentAccess(access: StudentAccess): StudentAccessLabel {
  switch (access.kind) {
    case "free":
      return { label: "—", variant: "neutral", detail: null };
    case "trial":
      return { label: "Sinov", variant: "warning", detail: `${formatDate(access.endsAt)} gacha` };
    case "paid":
      return { label: "To'langan", variant: "success", detail: `${formatDate(access.paidUntil)} gacha` };
    case "grace":
      return { label: "Muddati o'tgan", variant: "danger", detail: `${access.daysLeft} kundan keyin yopiladi` };
    case "blocked":
      return { label: "Yopiq", variant: "danger", detail: `${formatDate(access.endedAt)} dan beri` };
  }
}
