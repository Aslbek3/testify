import type { ReactNode } from "react";
import { requireAnySession } from "@/lib/auth";
import { getUserName } from "@/services/users";
import { countUnreadNotifications } from "@/services/notifications";
import { AppShell } from "@/components/AppShell";

/**
 * Hamma rol uchun umumiy sahifalar (profil, bildirishnomalar). Shuning
 * uchun `requireRole` emas, `requireAnySession` ishlatiladi, va `AppShell`
 * ga foydalanuvchining HAQIQIY roli beriladi: shunda yon menyu o'sha
 * rolning bo'limlarini ko'rsatadi va foydalanuvchi bu yerdan o'z paneliga
 * qaytib chiqa oladi.
 *
 * `(umumiy)` — route guruhi: URL'ga kirmaydi (`/profil`, `/bildirishnomalar`),
 * faqat shu layout'ni ikki sahifaga birday qo'llash uchun.
 */
export default async function SharedLayout({ children }: { children: ReactNode }) {
  const user = await requireAnySession();
  const [userName, unreadNotifications] = await Promise.all([
    getUserName(user.id),
    countUnreadNotifications(user.id),
  ]);

  return (
    <AppShell
      role={user.role}
      userName={userName ?? "Foydalanuvchi"}
      unreadNotifications={unreadNotifications}
    >
      {children}
    </AppShell>
  );
}
