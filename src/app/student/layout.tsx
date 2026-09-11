import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";
import { getUserName } from "@/services/users";
import { getStudentAccessForUser } from "@/services/studentPayments";
import { AppShell } from "@/components/AppShell";
import { StudentAccessBanner } from "./StudentAccessBanner";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("STUDENT");
  const [userName, access] = await Promise.all([
    getUserName(user.id),
    getStudentAccessForUser(user.id),
  ]);

  return (
    <AppShell
      role="STUDENT"
      userName={userName ?? "O'quvchi"}
      // Avtomaktab to'lovni tizim orqali qabul qilmasa, "To'lov" bandi
      // bo'sh sahifaga olib borardi — ko'rsatilmaydi.
      hiddenHrefs={access.kind === "free" ? ["/student/tolov"] : undefined}
    >
      {/* Yopiq holatda o'quvchi baribir faqat to'lov sahifasida bo'ladi
          (`(gated)/layout.tsx` yo'naltiradi) — u yerda havola ortiqcha. */}
      <StudentAccessBanner access={access} showLink={access.kind !== "blocked"} />
      {children}
    </AppShell>
  );
}
