import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";
import { getUserName } from "@/services/users";
import { countUnreadNotifications } from "@/services/notifications";
import { AppShell } from "@/components/AppShell";

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("OWNER");
  const [userName, unreadNotifications] = await Promise.all([
    getUserName(user.id),
    countUnreadNotifications(user.id),
  ]);

  return (
    <AppShell
      role="OWNER"
      userName={userName ?? "App Owner"}
      unreadNotifications={unreadNotifications}
    >
      {children}
    </AppShell>
  );
}
