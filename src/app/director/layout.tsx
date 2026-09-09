import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";
import { getUserName } from "@/services/users";
import { getSubscriptionSummary } from "@/services/payments";
import { getSubscriptionState } from "@/lib/subscription";
import { AppShell } from "@/components/AppShell";
import { SubscriptionWarningBanner } from "./SubscriptionCard";

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
  const subscription = user.organizationId
    ? await getSubscriptionSummary(user.organizationId)
    : null;
  const state = getSubscriptionState(
    subscription
      ? {
          status: subscription.status,
          subscriptionEndsAt: subscription.subscriptionEndsAt,
        }
      : null
  );

  return (
    <AppShell role="DIRECTOR" userName={userName}>
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
