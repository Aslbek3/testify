import type { ReactNode } from "react";
import { requireAnySession } from "@/lib/auth";
import { getUserName } from "@/services/users";
import { countUnreadNotifications } from "@/services/notifications";
import { countPendingStudentPayments } from "@/services/studentPayments";
import { AppShell } from "@/components/AppShell";
import { ROLE_LABEL } from "@/lib/roles";

/**
 * Obyekt sahifalarining qobig'i: `/guruh/[id]`, `/ustoz/[id]`,
 * `/oquvchi/[id]`.
 *
 * Nega rol papkasidan tashqarida: bitta guruhning sahifasi direktor,
 * qabulxona va ustoz uchun AYNI. Ilgari u ikki nusxada edi
 * (`/director/guruh/[id]` va `/tutor/guruh/[id]`), qabulxonada esa
 * umuman yo'q edi — ya'ni uchinchi nusxa yozilishi kerak bo'lardi.
 *
 * Endi mazmun bitta, farq faqat AMALLARDA: har bir sahifa
 * `lib/permissions.ts` dan javob olib, qaysi tugmani ko'rsatishni hal
 * qiladi. Havolalar ham soddalashdi — har joyda `/guruh/{id}`, chaqiruvchi
 * "men qaysi roldaman?" deb hisoblamaydi.
 *
 * Menyu esa rolniki bo'lib qoladi: `AppShell` foydalanuvchi roliga qarab
 * o'z bandlarini chizadi, ya'ni ustoz bu sahifada ham o'z menyusini
 * ko'radi va "Guruhlarim" ga qaytib keta oladi.
 */
export default async function ObjectLayout({ children }: { children: ReactNode }) {
  const user = await requireAnySession();

  // Menyudagi "To'lovlar (N)" — direktor va qabulxonada. Boshqa rollarda
  // bunday band yo'q, shuning uchun so'rov ham yuborilmaydi.
  const needsPaymentBadge =
    (user.role === "DIRECTOR" || user.role === "RECEPTION") && user.organizationId !== null;

  const [userName, unreadNotifications, pendingPayments] = await Promise.all([
    getUserName(user.id),
    countUnreadNotifications(user.id),
    needsPaymentBadge ? countPendingStudentPayments(user.organizationId!) : 0,
  ]);

  const paymentsHref =
    user.role === "DIRECTOR" ? "/director/tolovlar" : "/qabulxona/tolovlar";

  return (
    <AppShell
      role={user.role}
      userName={userName ?? ROLE_LABEL[user.role]}
      unreadNotifications={unreadNotifications}
      badges={needsPaymentBadge ? { [paymentsHref]: pendingPayments } : undefined}
    >
      {children}
    </AppShell>
  );
}
