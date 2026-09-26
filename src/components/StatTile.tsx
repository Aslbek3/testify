import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/Icon";

/**
 * Katta statistik ko'rsatkich uchun — jadval qatoridan ataylab kattaroq.
 *
 * Tuzilishi dizayn maketidagi `metric` kartochkasi: chapda yumaloq rangli
 * ikonka, o'ngda yorliq va uning ostida katta raqam, pastda qo'shimcha izoh.
 * (Ikonkani tepaga qo'yadigan variant ham ko'rildi — unda raqam kichrayib
 * qolar edi, chunki ikonka o'z qatorini egallaydi.)
 *
 * `tone` — FAQAT ikonka doirasining rangi. Raqam har doim asosiy matn
 * rangida qoladi: yonma-yon turgan to'rtta plitka bir-biridan ajralib
 * tursin, lekin ularning hech biri "ogohlantirish" ma'nosini bermasin.
 * Holat (yaxshi/yomon) `Badge` bilan beriladi, plitka rangi bilan emas.
 */
export type StatTone = "brand" | "info" | "purple" | "warning";

const TONE_STYLES: Record<StatTone, string> = {
  brand: "bg-brand-soft text-brand",
  info: "bg-info-soft text-info",
  purple: "bg-purple-soft text-purple",
  warning: "bg-warning-soft text-warning",
};

export function StatTile({
  label,
  value,
  sub,
  icon,
  tone = "brand",
  emphasis = "default",
  className,
}: {
  label: string;
  value: string | number;
  /** Raqam ostidagi izoh — masalan "Imtihonlar bo'yicha, o'quvchi kesimida". */
  sub?: string;
  /** Chapdagi yumaloq ikonka. Berilmasa doira ham chizilmaydi. */
  icon?: IconName;
  tone?: StatTone;
  /**
   * Har bir panelda FAQAT BITTA plitka `primary` bo'lishi kerak — bu
   * haqiqiy ustuvorlikni bildiradi, dekorativ variatsiya emas. U ikki
   * ustunni egallaydi va raqami kattaroq bo'ladi.
   */
  emphasis?: "primary" | "default";
  className?: string;
}) {
  const isPrimary = emphasis === "primary";

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-bg p-5 shadow-card",
        isPrimary && "col-span-2",
        className
      )}
    >
      <div className="flex items-center gap-3.5">
        {icon && (
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full",
              isPrimary ? "h-14 w-14" : "h-12 w-12",
              TONE_STYLES[tone]
            )}
          >
            <Icon name={icon} className={isPrimary ? "h-6 w-6" : "h-[22px] w-[22px]"} />
          </span>
        )}

        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold text-text-muted">{label}</p>
          <p
            className={cn(
              // `tabular-nums` — plitkalar yonma-yon turganda raqam
              // o'zgarganda (masalan 9 → 10) kenglik sakramasin.
              "mt-1 truncate font-display font-bold leading-none tracking-[-0.04em] tabular-nums text-text",
              isPrimary ? "text-[36px]" : "text-[28px]"
            )}
          >
            {value}
          </p>
        </div>
      </div>

      {sub && (
        <p className="mt-3.5 text-[11px] leading-snug text-text-faint">{sub}</p>
      )}
    </div>
  );
}
