import type { BadgeVariant } from "@/components/Badge";
import { EXAM_PASS_PERCENT } from "@/lib/examRules";

/**
 * O'quvchining imtihon (EXAM) o'rtacha balliga qarab tayyorgarlik holati —
 * ustoz (tutorDashboard) va direktor (directorDashboard) panellarida bir
 * xil qoida bo'yicha ishlatiladi, shuning uchun shu yerga chiqarilgan.
 */
export type ReadinessStatus = { label: string; variant: BadgeVariant };

/**
 * "Tayyor" chegarasi haqiqiy o'tish ballidan (EXAM_PASS_PERCENT = 90%)
 * kelib chiqadi. Ilgari bu yerda 85 turardi: o'rtacha 86% olgan o'quvchi
 * ustozga ham, direktorga ham "Tayyor" bo'lib ko'rinardi, lekin haqiqiy
 * imtihonda (20 tadan 3 xato) yiqilardi. Endi yorliq real natijani
 * bildiradi.
 */
const ALMOST_READY_PERCENT = 75;

export function readinessFromScore(averageScore: number | null): ReadinessStatus {
  if (averageScore === null) return { label: "Imtihon topshirilmagan", variant: "neutral" };
  if (averageScore >= EXAM_PASS_PERCENT) return { label: "Tayyor", variant: "success" };
  if (averageScore >= ALMOST_READY_PERCENT) {
    return { label: "Deyarli tayyor", variant: "warning" };
  }
  return { label: "Yordam kerak", variant: "danger" };
}
