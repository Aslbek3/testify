import type { OrganizationStatus } from "@prisma/client";

/**
 * Obuna muddati tugagandan keyin qancha vaqt kirish ochiq qoladi.
 *
 * Nega imtiyoz muddati kerak: to'lov bir kun kechikkani uchun butun
 * avtomaktabni dars o'rtasida uzib qo'yish qattiq va mijoz uchun
 * asossiz. Uch kun — direktor ogohlantirishni ko'rib, to'lovni amalga
 * oshirishga va owner uni tasdiqlashiga yetadigan muddat.
 */
export const SUBSCRIPTION_GRACE_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

export type SubscriptionState =
  /** Hammasi joyida. */
  | { kind: "active" }
  /** Muddat tugagan, lekin imtiyoz muddati davom etyapti. */
  | { kind: "grace"; daysLeft: number }
  /** Kirish yopiq. */
  | { kind: "blocked" };

/**
 * Tashkilotning obuna holati.
 *
 * Ikkita mustaqil sabab kirishni yopadi:
 * 1. `status = EXPIRED` — owner qo'lda to'xtatgan;
 * 2. `subscriptionEndsAt` + imtiyoz muddati o'tib ketgan — o'z-o'zidan.
 *
 * Ikkinchisi uchun hech qanday fon vazifasi (cron) kerak emas: holat har
 * so'rovda sessiya tekshiruvida hisoblanadi. Ya'ni obuna "o'zi" tugaydi,
 * uni kimdir eslab o'chirishi shart emas.
 *
 * `subscriptionEndsAt` `null` bo'lsa muddat belgilanmagan (sinov davri
 * yoki eski tashkilot) — bunda faqat `status` ishlaydi.
 */
export function getSubscriptionState(
  organization: { status: OrganizationStatus; subscriptionEndsAt: Date | null } | null,
  now: Date = new Date()
): SubscriptionState {
  // OWNER'da tashkilot yo'q — u hech qachon bloklanmaydi.
  if (!organization) return { kind: "active" };

  if (organization.status === "EXPIRED") return { kind: "blocked" };

  const endsAt = organization.subscriptionEndsAt;
  if (!endsAt) return { kind: "active" };

  const graceEndsAt = endsAt.getTime() + SUBSCRIPTION_GRACE_DAYS * DAY_MS;
  if (now.getTime() <= endsAt.getTime()) return { kind: "active" };
  if (now.getTime() <= graceEndsAt) {
    return {
      kind: "grace",
      // Yuqoriga yaxlitlanadi: bir necha soat qolganda ham "1 kun"
      // ko'rsatiladi, "0 kun" emas — "0" foydalanuvchiga hech narsa
      // aytmaydi va shoshilinchlikni ham bildirmaydi.
      daysLeft: Math.max(1, Math.ceil((graceEndsAt - now.getTime()) / DAY_MS)),
    };
  }
  return { kind: "blocked" };
}

/**
 * Yangi tugash sanasi: mavjud muddatning USTIGA qo'shiladi.
 *
 * Muddat hali tugamagan bo'lsa undan boshlab, tugagan bo'lsa bugundan.
 * Aks holda oldindan to'lagan mijoz o'z pulining bir qismini yo'qotardi.
 */
export function extendSubscription(
  currentEndsAt: Date | null,
  months: number,
  now: Date = new Date()
): Date {
  const base =
    currentEndsAt && currentEndsAt.getTime() > now.getTime() ? currentEndsAt : now;
  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  return next;
}
