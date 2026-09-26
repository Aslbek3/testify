import { cn } from "@/lib/cn";
import { readinessFromScore } from "@/lib/readiness";
import { BADGE_SOLID_CLASS } from "@/components/Badge";

/**
 * Jurnal qatoridagi taqqoslash shkalasi.
 *
 * Nega oddiy shkala emas: jurnalning ishi — SOLISHTIRISH. Ro'yxatda 12 ta
 * foiz turganda ularni bir-biriga qarab chiqish sekin. Shu sababli har bir
 * shkalada `average` qiymatida qora vertikal chiziq turadi — u hamma
 * qatorda BIR XIL joyda bo'ladi, ya'ni chiziqdan chapda qolgan guruh
 * darhol ko'zga tashlanadi.
 *
 * Rang `readinessFromScore` dan keladi — o'quvchi paneli, ustoz paneli va
 * jurnal bir xil chegaralarni ishlatadi (`EXAM_PASS_PERCENT`). Aks holda
 * bitta guruh jurnalda yashil, ustoz panelida sariq ko'rinardi.
 */
export function CompareBar({
  value,
  average,
  className,
}: {
  /** Foiz (0-100) yoki `null` — hali natija yo'q. */
  value: number | null;
  /** Taqqoslash chizig'i turadigan qiymat: tashkilot yoki guruh o'rtachasi. */
  average: number | null;
  className?: string;
}) {
  const variant = readinessFromScore(value).variant;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative h-2 min-w-[64px] flex-1 rounded-full bg-surface-2">
        {value !== null && (
          <div
            className={cn("h-full rounded-full", BADGE_SOLID_CLASS[variant])}
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          />
        )}
        {average !== null && (
          <span
            aria-hidden="true"
            // Chiziq shkaladan biroz baland — fon bilan qo'shilib ketmasligi
            // va to'ldirilgan qism ustida ham ko'rinib turishi kerak.
            className="absolute -top-1 bottom-[-4px] w-0.5 rounded-sm bg-text/45"
            style={{ left: `${Math.min(100, Math.max(0, average))}%` }}
          />
        )}
      </div>
      <span
        className={cn(
          "w-9 shrink-0 text-right font-mono text-[13px] font-semibold tabular-nums",
          value === null && "text-text-faint"
        )}
      >
        {value === null ? "—" : `${value}%`}
      </span>
    </div>
  );
}

/**
 * Shkala ostidagi izoh. Chiziq nimani anglatishini aytadi — usiz u shunchaki
 * tushunarsiz belgi bo'lib qolardi.
 */
export function CompareLegend({
  average,
  label = "Avtomaktab o'rtachasi",
}: {
  average: number | null;
  label?: string;
}) {
  if (average === null) return null;

  return (
    <p className="mt-3 flex items-center gap-2 text-[12px] text-text-faint">
      <span aria-hidden="true" className="inline-block h-3 w-0.5 rounded-sm bg-text/45" />
      {label} — <span className="font-mono tabular-nums">{average}%</span>
    </p>
  );
}
