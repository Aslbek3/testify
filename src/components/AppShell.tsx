"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/cn";
import { LogoutButton } from "@/components/LogoutButton";

type NavItem = { label: string; href: string };

const NAV_ITEMS: Record<Role, NavItem[]> = {
  OWNER: [
    { label: "Umumiy", href: "/owner" },
    { label: "Savollar", href: "/owner/questions" },
  ],
  DIRECTOR: [{ label: "Umumiy", href: "/director" }],
  TUTOR: [{ label: "Umumiy", href: "/tutor" }],
  STUDENT: [{ label: "Umumiy", href: "/student" }],
};

const ROLE_LABEL: Record<Role, string> = {
  OWNER: "App Owner",
  DIRECTOR: "Direktor",
  TUTOR: "Ustoz",
  STUDENT: "O'quvchi",
};

/** Ichma-ich yo'llar (masalan /owner/questions/[id]) uchun eng mos bandni topadi. */
function getActiveHref(pathname: string, items: NavItem[]): string | undefined {
  return items
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

export function AppShell({
  role,
  userName,
  children,
}: {
  role: Role;
  userName: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = NAV_ITEMS[role];
  const activeHref = getActiveHref(pathname, items);

  return (
    <div className="flex min-h-screen bg-bg-subtle">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-text/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar transition-transform duration-200 md:static md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-semibold text-white">
            T
          </span>
          <span className="text-base font-semibold text-white">Testify</span>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {items.map((item) => {
            const isActive = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-white/10 px-5 py-4">
          <div>
            <p className="truncate text-sm font-medium text-white">{userName}</p>
            <p className="text-xs text-white/50">{ROLE_LABEL[role]}</p>
          </div>
          <LogoutButton variant="ghost-dark" />
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col md:min-w-0">
        <header className="flex items-center gap-3 border-b border-border bg-bg px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Menyuni ochish"
            className="rounded-md p-1.5 text-text hover:bg-bg-subtle"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M2.5 5h15M2.5 10h15M2.5 15h15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <span className="text-sm font-semibold text-text">Testify</span>
        </header>

        <main className="flex-1 p-6 md:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
