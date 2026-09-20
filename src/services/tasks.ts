import type { RoleTask } from "@/lib/tasks";
import { sortTasks } from "@/lib/tasks";
import { INACTIVE_DAYS } from "@/lib/attention";
import { formatAmountUzs, daysSinceUz, formatRelativeDays } from "@/lib/format";
import {
  countInactiveStudents,
  listSilentTutors,
} from "@/services/directorDashboard";
import {
  listPendingStudentPayments,
  getStudentPaymentSettings,
} from "@/services/studentPayments";
import { getSubscriptionSummary } from "@/services/payments";
import { countUnreadNotifications } from "@/services/notifications";
import { getReceptionOverview, EXPIRING_SOON_DAYS } from "@/services/reception";

/**
 * Har bir rol uchun "bugungi ish" ro'yxatini yig'adi.
 *
 * Qoidalar `lib/tasks.ts` da yozilgan (sarlavha — muammo, tugma — fe'l,
 * daraja — ma'no). Bu yerda faqat ma'lumot yig'iladi va shu qoidalar
 * bo'yicha matn yoziladi.
 *
 * Har bir yig'uvchi BO'SH ro'yxat qaytarishi mumkin va bu normal holat —
 * aksariyat kunlari hech narsa shoshilinch emas.
 */

/** Obuna muddati shu kundan kam qolsa — shoshilinch. */
const SUBSCRIPTION_WARNING_DAYS = 10;

/** Ustoz shu kundan ko'p vazifa bermasa — "jim". */
const TUTOR_SILENT_DAYS = 14;

export async function getDirectorTasks(
  organizationId: string,
  userId: string
): Promise<RoleTask[]> {
  const [pending, subscription, inactiveCount, silentTutors, unread, paymentSettings] =
    await Promise.all([
      listPendingStudentPayments(organizationId),
      getSubscriptionSummary(organizationId),
      countInactiveStudents(organizationId, INACTIVE_DAYS),
      listSilentTutors(organizationId, TUTOR_SILENT_DAYS),
      countUnreadNotifications(userId),
      getStudentPaymentSettings(organizationId),
    ]);

  const tasks: RoleTask[] = [];

  // — Pul birinchi: kutayotgan chek o'quvchining kirishini to'xtatib turadi.
  if (paymentSettings.enabled && pending.length > 0) {
    const total = pending.reduce((sum, row) => sum + row.amount, 0);
    const oldest = pending[0]; // ro'yxat eng eskisi birinchi bo'lib keladi
    tasks.push({
      id: "pending-payments",
      severity: "urgent",
      icon: "wallet",
      title: `${pending.length} ta chek tasdiq kutmoqda`,
      detail: `${formatAmountUzs(total)} · eng eskisi ${formatRelativeDays(oldest.createdAt).toLowerCase()}`,
      action: "Tasdiqlash",
      href: "/director/tolovlar",
    });
  }

  // — Obuna: tugasa BUTUN avtomaktab kira olmay qoladi.
  if (subscription.status === "EXPIRED") {
    tasks.push({
      id: "subscription-expired",
      severity: "urgent",
      icon: "lock",
      title: "Obuna muddati tugagan",
      detail: "Hech kim tizimga kira olmaydi — to'lov xabarini yuboring.",
      action: "To'lash",
      href: "/director",
    });
  } else if (subscription.subscriptionEndsAt) {
    const daysLeft = Math.ceil(
      (subscription.subscriptionEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );
    if (daysLeft <= SUBSCRIPTION_WARNING_DAYS) {
      tasks.push({
        id: "subscription-soon",
        severity: daysLeft <= 3 ? "urgent" : "attention",
        icon: "clock",
        title: `Obuna ${daysLeft} kundan keyin tugaydi`,
        detail: subscription.hasPendingPayment
          ? "To'lov xabaringiz ko'rib chiqilmoqda."
          : "Muddat tugasa avtomaktab yopiladi.",
        action: subscription.hasPendingPayment ? "Holatni ko'rish" : "Uzaytirish",
        href: "/director",
      });
    }
  }

  // — Yo'qolgan o'quvchilar: bu pul emas, lekin natijaga bevosita ta'sir qiladi.
  if (inactiveCount > 0) {
    tasks.push({
      id: "inactive-students",
      severity: "attention",
      icon: "users",
      title: `${inactiveCount} o'quvchi ${INACTIVE_DAYS} kundan beri kirmagan`,
      detail: "Ustozlari bilan gaplashish kerak bo'lishi mumkin.",
      action: "Ro'yxatni ochish",
      href: "/director/oquvchilar?filtr=jim",
    });
  }

  // — Jim ustozlar: bittasi bo'lsa ismi bilan, ko'p bo'lsa son bilan.
  if (silentTutors.length === 1) {
    const tutor = silentTutors[0];
    tasks.push({
      id: `silent-tutor-${tutor.tutorId}`,
      severity: "attention",
      icon: "graduationCap",
      title:
        tutor.lastAssignmentAt === null
          ? `${tutor.tutorName} hali vazifa bermagan`
          : `${tutor.tutorName} ${daysSinceUz(tutor.lastAssignmentAt)} kundan beri vazifa bermagan`,
      detail: `${tutor.groupCount} ta guruhi bor`,
      action: "Ustoz sahifasi",
      href: `/director/ustoz/${tutor.tutorId}`,
    });
  } else if (silentTutors.length > 1) {
    tasks.push({
      id: "silent-tutors",
      severity: "attention",
      icon: "graduationCap",
      title: `${silentTutors.length} ta ustoz ${TUTOR_SILENT_DAYS} kundan beri vazifa bermagan`,
      detail: silentTutors
        .slice(0, 3)
        .map((t) => t.tutorName)
        .join(", "),
      action: "Jurnalni ochish",
      href: "/director/ustozlar?filtr=jim",
    });
  }

  if (unread > 0) {
    tasks.push({
      id: "notifications",
      severity: "info",
      icon: "bell",
      title: `${unread} ta yangi bildirishnoma`,
      action: "O'qish",
      href: "/bildirishnomalar",
    });
  }

  return sortTasks(tasks);
}

export async function getReceptionTasks(
  organizationId: string,
  userId: string,
  /** Qabulxona pul bilan ishlaydimi — direktor sozlamasidagi kalit. */
  handlesPayments: boolean
): Promise<RoleTask[]> {
  const [overview, unread] = await Promise.all([
    getReceptionOverview(organizationId),
    countUnreadNotifications(userId),
  ]);

  const tasks: RoleTask[] = [];

  // Muddati tugayotganlar birinchi: ertaga o'quvchi testga kira olmaydi,
  // ya'ni bugun qo'ng'iroq qilinsa muammo umuman bo'lmaydi.
  if (overview.expiringSoon.length > 0) {
    tasks.push({
      id: "expiring-students",
      severity: "urgent",
      icon: "clock",
      title: `${overview.expiringSoon.length} o'quvchining muddati tugayapti`,
      detail: `${EXPIRING_SOON_DAYS} kun ichida · qo'ng'iroq qilish kerak`,
      action: "Ro'yxatni ochish",
      href: "/qabulxona",
    });
  }

  if (handlesPayments && overview.pendingPaymentCount > 0) {
    tasks.push({
      id: "pending-receipts",
      severity: "urgent",
      icon: "wallet",
      title: `${overview.pendingPaymentCount} ta chek tasdiq kutmoqda`,
      detail: "Tasdiqlanmaguncha o'quvchi testga kira olmaydi.",
      action: "Tekshirish",
      href: "/qabulxona/tolovlar",
    });
  }

  if (overview.addedToday.length > 0) {
    tasks.push({
      id: "added-today",
      severity: "info",
      icon: "users",
      title: `Bugun ${overview.addedToday.length} ta o'quvchi qo'shildi`,
      detail: "Guruhi va to'lovi to'g'ri qo'yilganini tekshiring.",
      action: "Ko'rish",
      href: "/qabulxona/oquvchilar",
    });
  }

  if (unread > 0) {
    tasks.push({
      id: "notifications",
      severity: "info",
      icon: "bell",
      title: `${unread} ta yangi bildirishnoma`,
      action: "O'qish",
      href: "/bildirishnomalar",
    });
  }

  return sortTasks(tasks);
}
