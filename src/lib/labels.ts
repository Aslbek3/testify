import type { Plan, OrganizationStatus } from "@prisma/client";
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
