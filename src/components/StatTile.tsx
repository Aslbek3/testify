import { cn } from "@/lib/cn";

/**
 * Katta statistik ko'rsatkich uchun — jadval qatoridan ataylab kattaroq.
 * Har bir dashboard'da FAQAT BITTA plitka `emphasis="primary"` bo'lishi kerak
 * — bu haqiqiy ustuvorlikni bildiradi, dekorativ variatsiya emas.
 */
export function StatTile({
  label,
  value,
  sub,
  emphasis = "default",
  className,
}: {
  label: string;
  value: string | number;
  sub?: string;
  emphasis?: "primary" | "default";
  className?: string;
}) {
  const isPrimary = emphasis === "primary";

  return (
    <div
      className={cn(
        "rounded-lg border border-border p-5",
        isPrimary ? "col-span-2 bg-brand-soft" : "bg-bg",
        className
      )}
    >
      <p className="text-sm text-text-muted">{label}</p>
      <p
        className={cn(
          "mt-2 font-mono font-semibold tracking-tight text-text",
          isPrimary ? "text-4xl" : "text-3xl"
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-sm text-text-muted">{sub}</p>}
    </div>
  );
}
