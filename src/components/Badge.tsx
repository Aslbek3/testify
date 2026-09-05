import { cn } from "@/lib/cn";

export type BadgeVariant = "success" | "warning" | "danger" | "neutral" | "brand";

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  neutral: "bg-bg-subtle text-text-muted",
  brand: "bg-brand-soft text-brand",
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
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium",
        VARIANT_STYLES[variant]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
