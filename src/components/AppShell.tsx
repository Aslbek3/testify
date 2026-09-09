"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/cn";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

type NavItem = { label: string; href: string };

const NAV_ITEMS: Record<Role, NavItem[]> = {
  OWNER: [
    { label: "Umumiy", href: "/owner" },
    { label: "Savollar", href: "/owner/questions" },
  ],
  DIRECTOR: [
    { label: "Umumiy", href: "/director" },
    { label: "O'quvchilar", href: "/director/oquvchilar" },
  ],
  TUTOR: [{ label: "Umumiy", href: "/tutor" }],
  STUDENT: [
    { label: "Umumiy", href: "/student" },
    // Test rejimlari alohida bo'lim sifatida — ilgari hammasi bitta
    // "Test yechish" sahifasi ichida edi va o'quvchi qaysi rejimlar borligini
    // bosmaguncha bilmasdi.
    { label: "Mashq", href: "/student/mashq" },
    { label: "Maraton", href: "/student/maraton" },
    { label: "Imtihon", href: "/student/imtihon" },
    { label: "Xatolarim", href: "/student/xatolarim" },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  OWNER: "App Owner",
  DIRECTOR: "Direktor",
  TUTOR: "Ustoz",
  STUDENT: "O'quvchi",
};

const SIDEBAR_ID = "app-sidebar";

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
  const [isDesktop, setIsDesktop] = useState(true);
  const items = NAV_ITEMS[role];
  const activeHref = getActiveHref(pathname, items);

  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const firstNavLinkRef = useRef<HTMLAnchorElement>(null);
  const didMount = useRef(false);

  // Desktop kengligini kuzatamiz — "inert" faqat mobil kenglikda va yopiq
  // holatda qo'llanishi kerak, aks holda desktop'da sidebar butunlay
  // ishlamay qolardi.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Ochilganda birinchi menyu bandiga, yopilganda hamburger tugmaga fokus.
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    if (mobileOpen) {
      firstNavLinkRef.current?.focus();
    } else {
      hamburgerRef.current?.focus();
    }
  }, [mobileOpen]);

  // ESC bosilganda yopiladi.
  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  // Ochiq holatda orqa fon scroll qilinmasin.
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  const sidebarInert = !isDesktop && !mobileOpen;

  return (
    <div className="flex min-h-screen bg-bg-subtle">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        id={SIDEBAR_ID}
        inert={sidebarInert}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/5 bg-sidebar transition-transform duration-200 md:static md:translate-x-0",
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
          {items.map((item, index) => {
            const isActive = item.href === activeHref;
            return (
              <Link
                key={item.href}
                ref={index === 0 ? firstNavLinkRef : undefined}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  // Mobilda 44px balandlik (py-3) — telefonda bu asosiy navigatsiya
                  // va 36px nishonga barmoq bilan tegish noqulay edi.
                  "block rounded-md px-3 py-3 text-sm font-medium transition-colors pointer-fine:py-2",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            );
          })}

          {/* "Sozlamalar" — alohida guruh. Ilgari profilga faqat pastdagi
              ism bloki orqali kirilardi va uni ko'z bilan topib bo'lmasdi:
              u menyuga umuman o'xshamasdi. Endi u ham oddiy menyu bandi,
              faqat sarlavha bilan ajratilgan.

              Sarlavha ATAYLAB katta harflarda emas — CLAUDE.md dizayn
              qoidasi ALL CAPS yorliqlarni taqiqlaydi. */}
          <p className="px-3 pb-1 pt-5 text-xs font-medium text-white/35">
            Sozlamalar
          </p>
          <Link
            href="/profil"
            onClick={() => setMobileOpen(false)}
            aria-current={pathname === "/profil" ? "page" : undefined}
            className={cn(
              "block rounded-md px-3 py-3 text-sm font-medium transition-colors pointer-fine:py-2",
              pathname === "/profil"
                ? "bg-white/10 text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            )}
          >
            Profil
          </Link>
        </nav>

        <div className="space-y-3 border-t border-white/10 px-3 py-4">
          <div className="flex items-center justify-between gap-2">
            {/* Ism bloki ham profilga olib boradi — konvensiya shunday va
                odam uni shu yerdan ham qidiradi. Lekin endi u YAGONA yo'l
                emas: yuqorida "Sozlamalar > Profil" bandi bor. */}
            <Link
              href="/profil"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "min-w-0 flex-1 rounded-md px-2 py-2 transition-colors",
                pathname === "/profil" ? "bg-white/10" : "hover:bg-white/5"
              )}
            >
              <p className="truncate text-sm font-medium text-white">{userName}</p>
              <p className="text-xs text-white/50">{ROLE_LABEL[role]}</p>
            </Link>
            <ThemeToggle />
          </div>
          <div className="px-2">
            <LogoutButton variant="ghost-dark" />
          </div>
        </div>
      </aside>

      {/* `min-w-0` MOBILDA HAM shart. Flex elementining standart
          `min-width: auto` qiymati uni ichidagi eng keng elementdan
          (masalan 640px lik jadval) kichrayishga qo'ymaydi — natijada
          `overflow-x-auto` o'rami ham kengayib ketadi va jadval o'z
          konteyneri ichida emas, BUTUN SAHIFA bo'ylab gorizontal scroll
          hosil qiladi. Ilgari bu sinf `md:` bilan chegaralangan edi va
          390px ekranda /tutor sahifasi 1001px kenglikda ochilardi. */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-bg px-4 py-3 md:hidden">
          <button
            ref={hamburgerRef}
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Menyuni ochish"
            aria-expanded={mobileOpen}
            aria-controls={SIDEBAR_ID}
            // 44x44 — barmoq uchun eng kam tavsiya etiladigan o'lcham.
              // Ilgari 32x32 edi.
              className="flex h-11 w-11 items-center justify-center rounded-md text-text hover:bg-bg-subtle"
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
