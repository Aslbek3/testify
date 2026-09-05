import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";
import { getUserName } from "@/services/users";
import { AppShell } from "@/components/AppShell";

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("OWNER");
  const userName = (await getUserName(user.id)) ?? "App Owner";

  return (
    <AppShell role="OWNER" userName={userName}>
      {children}
    </AppShell>
  );
}
