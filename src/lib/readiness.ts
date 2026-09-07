import type { BadgeVariant } from "@/components/Badge";

/**
 * O'quvchining imtihon (EXAM) o'rtacha balliga qarab tayyorgarlik holati —
 * ustoz (tutorDashboard) va direktor (directorDashboard) panellarida bir
 * xil qoida bo'yicha ishlatiladi, shuning uchun shu yerga chiqarilgan.
 */
export type ReadinessStatus = { label: string; variant: BadgeVariant };

export function readinessFromScore(averageScore: number | null): ReadinessStatus {
  if (averageScore === null) return { label: "Imtihon topshirilmagan", variant: "neutral" };
  if (averageScore >= 85) return { label: "Tayyor", variant: "success" };
  if (averageScore >= 65) return { label: "Deyarli tayyor", variant: "warning" };
  return { label: "Yordam kerak", variant: "danger" };
}
