"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/cn";
import { ROLE_LABEL } from "@/lib/roles";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Icon, type IconName } from "@/components/Icon";

type NavItem = { label: string; href: string; icon: IconName };

const NAV_ITEMS: Record<Role, NavItem[]> = {
  OWNER: [
    { label: "Umumiy", href: "/owner", icon: "grid" },
    { label: "Savollar", href: "/owner/questions", icon: "book" },
  ],
  // Uchta jurnal ketma-ket turadi: guruh → ustoz → o'quvchi. Bu
  // avtomaktabning o'z tuzilishi bo'yicha tartib, ya'ni direktor "kim qayerda"
  // degan savolga menyuning o'zidan javob topadi.
  DIRECTOR: [
    { label: "Umumiy", href: "/director", icon: "grid" },
    { label: "Guruhlar", href: "/director/guruhlar", icon: "building" },
    { label: "Ustozlar", href: "/director/ustozlar", icon: "graduationCap" },
    { label: "O'quvchilar", href: "/director/oquvchilar", icon: "users" },
    { label: "To'lovlar", href: "/director/tolovlar", icon: "wallet" },
  ],
  // Qabulxona menyusi direktornikining ma'muriy qismi — o'sha tartibda,
  // o'sha nomlar bilan: ikkalasi bir xil ishni qiladi va bir-biriga
  // "qaysi bo'limda?" deb tushuntira olishi kerak.
  RECEPTION: [
    { label: "Umumiy", href: "/qabulxona", icon: "grid" },
    { label: "O'quvchilar", href: "/qabulxona/oquvchilar", icon: "users" },
    { label: "To'lovlar", href: "/qabulxona/tolovlar", icon: "wallet" },
  ],
  TUTOR: [{ label: "Umumiy", href: "/tutor", icon: "grid" }],
  STUDENT: [
    { label: "Umumiy", href: "/student", icon: "grid" },
    // Test rejimlari alohida bo'lim sifatida — ilgari hammasi bitta
    // "Test yechish" sahifasi ichida edi va o'quvchi qaysi rejimlar borligini
    // bosmaguncha bilmasdi.
    { label: "Biletlar", href: "/student/bilet", icon: "ticket" },
    { label: "Mashq", href: "/student/mashq", icon: "target" },
    { label: "Maraton", href: "/student/maraton", icon: "flame" },
    { label: "Imtihon", href: "/student/imtihon", icon: "clipboardCheck" },
    { label: "Xatolarim", href: "/student/xatolarim", icon: "alertTriangle" },
    { label: "To'lov", href: "/student/tolov", icon: "creditCard" },
  ],
};

const SIDEBAR_ID = "app-sidebar";

/**
 * Telefonda pastda turadigan bandlar — FAQAT o'quvchi uchun.
 *
 * Sababi: o'quvchilarning deyarli hammasi telefondan kiradi va kunlik
 * ishi shu to'rtta bo'limda. Chap menyu — kompyuter naqshi, telefonda u
 * yashirin va har safar ochish kerak. Ustoz/direktor/owner stol ustida
 * ishlaydi, ularda avvalgidek qoladi.
 *
 * Qolgan bandlar (Maraton, To'lov, Profil, Bildirishnomalar) "Menyu"
 * tugmasi ortida — u o'sha chap menyuni ochadi.
 */
const BOTTOM_NAV_HREFS = ["/student", "/student/mashq", "/student/imtihon", "/student/xatolarim"];

/** Ichma-ich yo'llar (masalan /owner/questions/[id]) uchun eng mos bandni topadi. */
function getActiveHref(pathname: string, items: NavItem[]): string | undefined {
  return items
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

const NOTIFICATIONS_HREF = "/bildirishnomalar";

/**
 * Sidebar bandining umumiy ko'rinishi.
 *
 * Faol band to'ldirilgan turkuaz — navy fonda u yagona rangli element
 * bo'ladi va foydalanuvchi qayerdaligini bir qarashda ko'radi. Ilgari faol
 * band faqat `bg-white/10` edi va qorong'i fonda deyarli bilinmasdi.
 *
 * Mobilda 44px balandlik (py-3) — telefonda bu asosiy navigatsiya va 36px
 * nishonga barmoq bilan tegish noqulay edi.
 */
const NAV_LINK_CLASS =
  "flex items-center gap-3 rounded-md px-3.5 py-3 text-[13px] font-medium transition-colors pointer-fine:py-2.5";

function navLinkTone(isActive: boolean): string {
  return isActive
    ? "bg-brand text-white shadow-brand"
    : "text-white/55 hover:bg-white/10 hover:text-white";
}

function CountBadge({ count, active }: { count: number; active?: boolean }) {
  return (
    <span
      className={cn(
        "ml-auto min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold leading-4",
        // Faol band allaqachon turkuaz — uning ustidagi turkuaz son
        // ko'rinmay qolardi.
        active ? "bg-white/25 text-white" : "bg-brand text-white"
      )}
    >
      {count}
    </span>
  );
}

export function AppShell({
  role,
  userName,
  hiddenHrefs,
  badges,
  unreadNotifications = 0,
  children,
}: {
  role: Role;
  userName: string;
  /**
   * Shu foydalanuvchiga keraksiz bandlar — masalan avtomaktab to'lovni
   * tizim orqali qabul qilmasa, o'quvchida "To'lov" bandi ko'rinmaydi.
   * Ro'yxatning o'zi (`NAV_ITEMS`) bitta joyda qoladi, bu yerda faqat
   * yashiriladi.
   */
  hiddenHrefs?: string[];
  /** Band yonidagi son (masalan tasdiq kutayotgan to'lovlar). 0 — ko'rsatilmaydi. */
  badges?: Record<string, number>;
  /** O'qilmagan bildirishnomalar — menyuda va mobil sarlavhadagi qo'ng'iroqchada. */
  unreadNotifications?: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const items = NAV_ITEMS[role].filter((item) => !hiddenHrefs?.includes(item.href));
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

  // Test ishlayotganda ekranda faqat savol qoladi: menyu ham, sarlavha ham,
  // pastki panel ham yo'q. Natija sahifasi (`/natija`) bundan tashqarida —
  // u o'qish uchun, ishlash uchun emas.
  const isTestScreen =
    pathname.startsWith("/student/test") && !pathname.includes("/natija");
  if (isTestScreen) {
    return (
      <div className="min-h-screen bg-navy">
        <main className="mx-auto max-w-4xl p-4 md:p-8">{children}</main>
      </div>
    );
  }

  const bottomItems =
    role === "STUDENT"
      ? BOTTOM_NAV_HREFS.map((href) => items.find((item) => item.href === href)).filter(
          (item): item is NavItem => item !== undefined
        )
      : [];

  const isNotificationsActive = pathname === NOTIFICATIONS_HREF;
  const isProfileActive = pathname === "/profil";

  return (
    <div className="flex min-h-screen bg-bg-subtle">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy/60 backdrop-blur-[2px] md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        id={SIDEBAR_ID}
        inert={sidebarInert}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[250px] flex-col bg-sidebar px-4 py-6 transition-transform duration-200 md:static md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="mb-8 flex items-center gap-2.5 px-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-brand font-display text-base font-bold text-white">
            T
          </span>
          <span className="leading-tight">
            <span className="block font-display text-[17px] font-bold text-white">
              Testify
            </span>
            {/* Rol shu yerda: foydalanuvchi qaysi huquq bilan kirganini
                pastdagi ism blokini qidirmasdan ko'radi. */}
            <span className="block text-[11px] font-medium text-white/40">
              {ROLE_LABEL[role]}
            </span>
          </span>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto">
          {items.map((item, index) => {
            const isActive = item.href === activeHref;
            return (
              <Link
                key={item.href}
                ref={index === 0 ? firstNavLinkRef : undefined}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(NAV_LINK_CLASS, navLinkTone(isActive))}
              >
                <Icon name={item.icon} className="h-[18px] w-[18px]" />
                {item.label}
                {badges?.[item.href] ? (
                  <CountBadge count={badges[item.href]} active={isActive} />
                ) : null}
              </Link>
            );
          })}

          {/* Bildirishnomalar — barcha rollar uchun umumiy band, rolning
              o'z bo'limlaridan keyin. `NAV_ITEMS` ga qo'shilmagan: u yerda
              har rolga alohida takrorlanishi kerak bo'lardi. */}
          <Link
            href={NOTIFICATIONS_HREF}
            onClick={() => setMobileOpen(false)}
            aria-current={isNotificationsActive ? "page" : undefined}
            className={cn(NAV_LINK_CLASS, navLinkTone(isNotificationsActive))}
          >
            <Icon name="bell" className="h-[18px] w-[18px]" />
            Bildirishnomalar
            {unreadNotifications > 0 && (
              <CountBadge count={unreadNotifications} active={isNotificationsActive} />
            )}
          </Link>

          {/* "Sozlamalar" — alohida guruh. Ilgari profilga faqat pastdagi
              ism bloki orqali kirilardi va uni ko'z bilan topib bo'lmasdi:
              u menyuga umuman o'xshamasdi. Endi u ham oddiy menyu bandi,
              faqat sarlavha bilan ajratilgan. */}
          <p className="px-3.5 pb-1 pt-6 text-[11px] font-semibold text-white/35">
            Sozlamalar
          </p>
          <Link
            href="/profil"
            onClick={() => setMobileOpen(false)}
            aria-current={isProfileActive ? "page" : undefined}
            className={cn(NAV_LINK_CLASS, navLinkTone(isProfileActive))}
          >
            <Icon name="user" className="h-[18px] w-[18px]" />
            Profil
          </Link>
        </nav>

        <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between gap-2">
            {/* Ism bloki ham profilga olib boradi — konvensiya shunday va
                odam uni shu yerdan ham qidiradi. Lekin endi u YAGONA yo'l
                emas: yuqorida "Sozlamalar > Profil" bandi bor. */}
            <Link
              href="/profil"
              onClick={() => setMobileOpen(false)}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-white/10"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft font-display text-[13px] font-bold text-brand">
                {userName.trim().charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-white">
                  {userName}
                </span>
                <span className="block text-[11px] text-white/45">
                  Profil va sozlamalar
                </span>
              </span>
            </Link>
            <ThemeToggle />
          </div>
          <LogoutButton variant="ghost-dark" />
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
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-bg px-4 py-2.5 md:hidden">
          <button
            ref={hamburgerRef}
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Menyuni ochish"
            aria-expanded={mobileOpen}
            aria-controls={SIDEBAR_ID}
            // 44x44 — barmoq uchun eng kam tavsiya etiladigan o'lcham.
            // Ilgari 32x32 edi.
            className="-ml-1.5 flex h-11 w-11 items-center justify-center rounded-md text-text transition-colors hover:bg-bg-subtle"
          >
            <Icon name="menu" />
          </button>

          <span className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-brand font-display text-[13px] font-bold text-white">
              T
            </span>
            <span className="font-display text-[15px] font-bold text-text">Testify</span>
          </span>

          {/* Mobilda menyu yopiq turadi — yangi bildirishnoma borligini
              uni ochmasdan ham ko'rish uchun. */}
          <Link
            href={NOTIFICATIONS_HREF}
            aria-label={
              unreadNotifications > 0
                ? `Bildirishnomalar: ${unreadNotifications} ta o'qilmagan`
                : "Bildirishnomalar"
            }
            className="relative -mr-1.5 ml-auto flex h-11 w-11 items-center justify-center rounded-md text-text transition-colors hover:bg-bg-subtle"
          >
            <Icon name="bell" />
            {unreadNotifications > 0 && (
              <span className="absolute right-1 top-1 min-w-[18px] rounded-full bg-danger px-1 text-center text-[10px] font-bold leading-[18px] text-white">
                {unreadNotifications}
              </span>
            )}
          </Link>
        </header>

        {/* Pastki panel kontentni bekitmasligi uchun joy qoldiriladi. */}
        <main
          className={cn(
            // Spetsifikatsiya: desktopda 32-40px, mobilda 14-20px.
            "flex-1 p-4 sm:p-6 md:p-9",
            bottomItems.length > 0 && "pb-24 md:pb-9"
          )}
        >
          <div className="mx-auto max-w-[1180px]">{children}</div>
        </main>

        {bottomItems.length > 0 && (
          <nav
            aria-label="Asosiy bo'limlar"
            className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] md:hidden"
          >
            {bottomItems.map((item) => {
              const isActive = item.href === activeHref;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2.5 text-center text-[10px] font-semibold transition-colors",
                    isActive ? "text-brand" : "text-text-faint"
                  )}
                >
                  <Icon name={item.icon} className="h-[22px] w-[22px]" />
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Menyuni ochish"
              aria-expanded={mobileOpen}
              aria-controls={SIDEBAR_ID}
              className="flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2.5 text-[10px] font-semibold text-text-faint transition-colors"
            >
              <Icon name="menu" className="h-[22px] w-[22px]" />
              Menyu
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
