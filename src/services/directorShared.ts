import type { Prisma } from "@prisma/client";

/**
 * Direktor bo'limining UMUMIY qismlari.
 *
 * `directorDashboard.ts` dan ajratilgan (2026-09-27): u 953 qatorga
 * yetgan edi. Bu yerda faqat uchala bo'lim ham ishlatadigan narsalar
 * turadi — aks holda fayllar bir-birini aylanma import qilib qolardi.
 */

export class DirectorActionError extends Error {}

export function studentScope(organizationId: string): Prisma.UserWhereInput {
  return { organizationId, role: "STUDENT", studentProfile: { isNot: null } };
}

/**
 * Tashkilotning o'rtacha bali.
 *
 * Uch narsa ataylab shunday:
 * 1. FAQAT `mode = 'EXAM'` va `finishedAt IS NOT NULL` — mashqda javob darhol
 *    ko'rsatiladi (ball sun'iy yuqori), tashlab ketilgan urinishning javobsiz
 *    savollari esa hali "xato" emas. `score IS NOT NULL` yolg'iz o'zi yetarli
 *    emas edi: u ikki maydon doim birga yozilishiga tayanadigan mo'rt shart.
 * 2. Avval HAR BIR O'QUVCHINING o'rtachasi, keyin o'quvchilar o'rtachasi
 *    (`GROUP BY a."studentId"` + tashqi `AVG`). Barcha urinishlarni bitta
 *    ro'yxatga qo'shib o'rtachalash noto'g'ri: 10 ta imtihonni 50% ga
 *    topshirgan o'quvchi va 1 ta imtihonni 100% ga topshirgan o'quvchida
 *    urinish bo'yicha 55%, o'quvchi bo'yicha esa 75% chiqadi. Pastdagi
 *    ustozlar reytingi aynan shu — o'quvchi bo'yicha — usulda hisoblaydi,
 *    ya'ni endi bitta sahifada bir-biriga zid ikkita raqam chiqmaydi.
 * 3. Bog'lanish `Attempt.groupId → Group.organizationId` orqali, o'quvchining
 *    HOZIRGI guruhi orqali emas — `getTutorRanking` bilan bir xil qoida.
 *
 * Agregatsiya bazada bajariladi: aks holda 500 o'quvchi × 50 imtihon = 25 000
 * qator faqat bitta o'rtacha uchun Node'ga tortilardi.
 */
