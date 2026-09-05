import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";
import { getUserName } from "@/services/users";
import { AppShell } from "@/components/AppShell";

export default async function DirectorLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("DIRECTOR");
  const userName = (await getUserName(user.id)) ?? "Direktor";

  return (
    <AppShell role="DIRECTOR" userName={userName}>
      {children}
    </AppShell>
  );
}
