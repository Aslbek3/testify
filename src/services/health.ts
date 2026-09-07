import { prisma } from "@/lib/prisma";

/**
 * Bazaga ulanish holatini tekshirish natijasi.
 *
 * Xato obyekti ataylab saqlanib qaytariladi: route uni `logError` orqali
 * to'liq (stack bilan) yozadi, javobning o'zida esa hech qanday tafsilot
 * chiqarilmaydi — monitoring endpoint ochiq (sessiyasiz) bo'lgani uchun.
 */
export type DatabaseHealth = { ok: true } | { ok: false; error: unknown };

/**
 * Bazaga eng arzon "tirikmi?" so'rovi. Route'lar Prisma'ni bevosita
 * chaqirmasligi kerak (arxitektura qoidasi: route → service → Prisma),
 * shuning uchun health-check ping ham shu yerda turadi.
 */
export async function checkDatabaseConnection(): Promise<DatabaseHealth> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}
