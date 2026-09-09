import type { ReactNode } from "react";
import { requireAnySession } from "@/lib/auth";
import { getUserName } from "@/services/users";
import { AppShell } from "@/components/AppShell";

/**
 * Profil — yagona sahifa, hamma rol uchun. Shuning uchun `requireRole`
 * emas, `requireAnySession` ishlatiladi, va `AppShell` ga foydalanuvchining
 * HAQIQIY roli beriladi: shunda yon menyu o'sha rolning bo'limlarini
 * ko'rsatadi va foydalanuvchi profildan o'z paneliga qaytib chiqa oladi.
 */
export default async function ProfilLayout({ children }: { children: ReactNode }) {
  const user = await requireAnySession();
  const userName = (await getUserName(user.id)) ?? "Foydalanuvchi";

  return (
    <AppShell role={user.role} userName={userName}>
      {children}
    </AppShell>
  );
}
