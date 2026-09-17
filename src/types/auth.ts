import type { Role } from "@prisma/client";

/**
 * Tashkilot darajasidagi rol kalitlari — "ochiq modulni kim ishlatadi"
 * degan savolga javob (`docs/rollar.md`). Bor-yo'g'i to'rtta va shunday
 * qoladi: har bir kalit test matritsasini ikki barobar kattalashtiradi.
 */
export type OrganizationSwitches = {
  /** Qabulxona chekni tasdiqlaydi/rad etadi va naqd to'lovni qayd etadi. */
  receptionHandlesPayments: boolean;
  /** Qabulxona o'quvchining progressi va urinishlarini ko'radi. */
  receptionSeesProgress: boolean;
  /** Ustoz o'z guruhiga o'quvchi qo'shadi va bloklaydi. */
  tutorManagesStudents: boolean;
  /** Ustoz o'z o'quvchisining parolini tiklaydi. */
  tutorResetsPasswords: boolean;
};

/**
 * Tashkilotsiz foydalanuvchi (OWNER) uchun. Qiymatlar hech qanday
 * qo'shimcha huquq bermaydi: owner'ga bu kalitlar baribir tegishli emas,
 * ustoz/qabulxona esa tashkilotsiz umuman bo'lmaydi.
 */
export const NO_ORGANIZATION_SWITCHES: OrganizationSwitches = {
  receptionHandlesPayments: false,
  receptionSeesProgress: false,
  tutorManagesStudents: false,
  tutorResetsPasswords: false,
};

/**
 * JWT ichida saqlanadigan qism — faqat o'zgarmaydigan identifikatorlar.
 *
 * Kalitlar bu yerda ATAYLAB yo'q: token bir hafta yashaydi, direktor esa
 * kalitni istalgan payt o'zgartiradi va u "darhol kuchga kirishi" kerak
 * (`docs/rollar.md`). Tokenga yozilsa, kalit o'chirilgandan keyin ham
 * qabulxona bir hafta davomida pul bilan ishlab yuraverardi.
 */
export type SessionToken = {
  id: string;
  role: Role;
  organizationId: string | null;
  sessionVersion: number;
};

/**
 * Tekshirilgan sessiya — `getVerifiedSessionUser()` qaytaradi.
 *
 * `switches` bazadan, har so'rovda o'qiladi (tashkilot allaqachon
 * sessiya tekshiruvi so'rovida olinadi — qo'shimcha so'rov emas). Shu
 * sabab `lib/permissions.ts` dagi funksiyalar sof va SINXRON qoladi:
 * ular hech qachon bazaga bormaydi.
 */
export type SessionUser = SessionToken & {
  switches: OrganizationSwitches;
};
