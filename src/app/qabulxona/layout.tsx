import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";
import { getUserName } from "@/services/users";
import { AppShell } from "@/components/AppShell";
import { countPendingStudentPayments } from "@/services/studentPayments";
import { countUnreadNotifications } from "@/services/notifications";

/**
 * Qabulxona paneli.
 *
 * Obuna ogohlantirishi (direktordagi `SubscriptionWarningBanner`) bu
 * yerda ATAYLAB yo'q: avtomaktabning owner'ga to'lovi — direktorning
 * javobgarligi, qabulxona uni hal qila olmaydi. Tarif muddati butunlay
 * tugasa sessiya baribir `requireRole` orqali bekor bo'ladi.
 */
export default async function ReceptionLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("RECEPTION");
  const [userName, pendingStudentPayments, unreadNotifications] = await Promise.all([
    getUserName(user.id),
    // Menyudagi "To'lovlar (N)" — qabulxona qaysi sahifada bo'lmasin,
    // yangi chek kelganini ko'rsin. Kalit o'chirilgan bo'lsa ham son
    // ko'rsatiladi: cheklar ro'yxati unga baribir ochiq (faqat
    // tasdiqlash tugmasi yo'q).
    user.organizationId ? countPendingStudentPayments(user.organizationId) : 0,
    countUnreadNotifications(user.id),
  ]);

  return (
    <AppShell
      role="RECEPTION"
      userName={userName ?? "Qabulxona"}
      badges={{ "/qabulxona/tolovlar": pendingStudentPayments }}
      unreadNotifications={unreadNotifications}
    >
      {children}
    </AppShell>
  );
}
