import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";
import { getUserName } from "@/services/users";
import { countUnreadNotifications } from "@/services/notifications";
import { AppShell } from "@/components/AppShell";

export default async function TutorLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("TUTOR");
  const [userName, unreadNotifications] = await Promise.all([
    getUserName(user.id),
    countUnreadNotifications(user.id),
  ]);

  return (
    <AppShell
      role="TUTOR"
      userName={userName ?? "Ustoz"}
      unreadNotifications={unreadNotifications}
    >
      {children}
    </AppShell>
  );
}
