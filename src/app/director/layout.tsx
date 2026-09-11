import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";
import { getUserName } from "@/services/users";
import { getSubscriptionSummary } from "@/services/payments";
import { getSubscriptionState } from "@/lib/subscription";
import { AppShell } from "@/components/AppShell";
import { SubscriptionWarningBanner } from "./SubscriptionCard";
import { ORGANIZATION_BILLING_UI_ENABLED } from "@/lib/payments";
import { countPendingStudentPayments } from "@/services/studentPayments";

export default async function DirectorLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("DIRECTOR");
  const userName = (await getUserName(user.id)) ?? "Direktor";

  // Obuna holati layout darajasida olinadi — direktor qaysi sahifada
  // bo'lishidan qat'i nazar ogohlantirishni ko'rishi kerak. Bu ATAYLAB
  // `AppShell` ichida emas: o'sha komponent barcha rollar uchun umumiy va
  // u yerga qo'yilsa, banner ustoz va o'quvchiga ham chiqib ketardi.
  // Ular to'lovni hal qila olmaydi — javobgarlik direktorda.
  //
  // Tashkilotsiz direktor (`organizationId` null) sahifada alohida
  // xabar ko'radi, bu yerda esa hech narsa so'ralmaydi.
  //
  // Avtomaktab → owner to'lovi ekranlari o'chiq bo'lsa banner ham
  // chiqmaydi: u "Obuna" kartochkasiga yo'naltiradi, u esa yashirilgan.
  const [subscription, pendingStudentPayments] = await Promise.all([
    user.organizationId && ORGANIZATION_BILLING_UI_ENABLED
      ? getSubscriptionSummary(user.organizationId)
      : null,
    // Menyudagi "To'lovlar (N)" — direktor qaysi sahifada bo'lmasin,
    // yangi chek kelganini ko'rsin.
    user.organizationId ? countPendingStudentPayments(user.organizationId) : 0,
  ]);
  const state = getSubscriptionState(
    subscription
      ? {
          status: subscription.status,
          subscriptionEndsAt: subscription.subscriptionEndsAt,
        }
      : null
  );

  return (
    <AppShell
      role="DIRECTOR"
      userName={userName}
      badges={{ "/director/tolovlar": pendingStudentPayments }}
    >
      {/* "blocked" holati bu yerga yetib kelmaydi: sessiya tekshiruvi
          (`requireRole`) bunday foydalanuvchini allaqachon chiqarib
          yuborgan bo'ladi. Shu sabab faqat imtiyoz muddati tekshiriladi. */}
      {state.kind === "grace" && subscription && (
        <div className="mb-6">
          <SubscriptionWarningBanner
            daysLeft={state.daysLeft}
            hasPendingPayment={subscription.hasPendingPayment}
            href="/director"
          />
        </div>
      )}
      {children}
    </AppShell>
  );
}
