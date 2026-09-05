"use client";

import { useRouter } from "next/navigation";
import { Button, type ButtonVariant } from "@/components/Button";

export function LogoutButton({
  variant = "secondary",
  className,
}: {
  variant?: ButtonVariant;
  className?: string;
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <Button type="button" variant={variant} className={className} onClick={handleLogout}>
      Chiqish
    </Button>
  );
}
