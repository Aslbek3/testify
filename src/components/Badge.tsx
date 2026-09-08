import { cn } from "@/lib/cn";

export type BadgeVariant = "success" | "warning" | "danger" | "neutral" | "brand";

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  neutral: "bg-bg-subtle text-text-muted",
  brand: "bg-brand-soft text-brand",
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
  neutral: "bg-text-muted",
  brand: "bg-brand",
};

export function Badge({
  variant = "neutral",
  children,
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        // font-sans — raqamli (font-mono) ustunlar ichiga qo'yilganda ham
        // (masalan "Davom etmoqda" holat belgisi) shrift meros olib qolmasin.
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-sans font-medium",
        VARIANT_STYLES[variant]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
