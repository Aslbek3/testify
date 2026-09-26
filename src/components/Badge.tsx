import { cn } from "@/lib/cn";

export type BadgeVariant = "success" | "warning" | "danger" | "neutral" | "brand";

// Fon `*-soft` tokenidan keladi, `bg-success/10` dan emas: shaffof rang
// qorong'i rejimda sirt rangi bilan qo'shilib ketib, yorliq deyarli
// ko'rinmay qolardi. `ring` — chegara joyni egallamaydi, lekin yorliqqa
// shakl beradi.
const VARIANT_STYLES: Record<BadgeVariant, string> = {
  success: "bg-success-soft text-success ring-1 ring-success/20",
  warning: "bg-warning-soft text-warning ring-1 ring-warning/20",
  danger: "bg-danger-soft text-danger ring-1 ring-danger/20",
  neutral: "bg-surface-2 text-text-muted ring-1 ring-border",
  brand: "bg-brand-soft text-brand ring-1 ring-brand/20",
};

/**
 * Ayni variantning TO'LDIRILGAN (to'q) rangi — shkala (progress bar) uchun.
 *
 * Badge bilan bitta joyda turadi, chunki ular doim yonma-yon ishlatiladi:
 * o'quvchi va ustoz panellarida har bir mavzu qatorida shkala va uning
 * yonida shu rangdagi Badge bo'ladi. Ikki nusxada saqlansa, biri
 * o'zgartirilib ikkinchisi unutilganda shkala bilan yorliq turli rangda
 * qolib ketardi.
 */
export const BADGE_SOLID_CLASS: Record<BadgeVariant, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-text-faint",
  brand: "bg-brand",
};

export function Badge({
  variant = "neutral",
  dot = true,
  children,
}: {
  variant?: BadgeVariant;
  /** Rangli nuqta. Faqat raqam ko'rsatadigan yorliqlarda o'chiriladi —
   *  u yerda nuqta ma'no bermaydi, faqat joy oladi. */
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        // font-sans — raqamli (font-mono) ustunlar ichiga qo'yilganda ham
        // (masalan "Davom etmoqda" holat belgisi) shrift meros olib qolmasin.
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 font-sans text-[13px] font-semibold",
        VARIANT_STYLES[variant]
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
