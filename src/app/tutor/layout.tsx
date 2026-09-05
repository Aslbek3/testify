import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";
import { getUserName } from "@/services/users";
import { AppShell } from "@/components/AppShell";

export default async function TutorLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("TUTOR");
  const userName = (await getUserName(user.id)) ?? "Ustoz";

  return (
    <AppShell role="TUTOR" userName={userName}>
      {children}
    </AppShell>
  );
}
