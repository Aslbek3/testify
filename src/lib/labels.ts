import type { Plan, OrganizationStatus, PaymentStatus } from "@prisma/client";
import type { BadgeVariant } from "@/components/Badge";

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
