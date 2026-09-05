import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";
import { getUserName } from "@/services/users";
import { AppShell } from "@/components/AppShell";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("STUDENT");
  const userName = (await getUserName(user.id)) ?? "O'quvchi";

  return (
    <AppShell role="STUDENT" userName={userName}>
      {children}
    </AppShell>
  );
}
