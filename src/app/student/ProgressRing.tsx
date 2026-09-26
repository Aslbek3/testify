import { readinessFromScore } from "@/lib/readiness";
import type { BadgeVariant } from "@/components/Badge";

/**
 * Tayyorgarlik halqasi.
 *
 * Ilgari `conic-gradient` bilan chizilardi — u bitta CSS qatori, lekin
 * qirrasi arralangan chiqadi va uchlari o'tkir bo'ladi. SVG halqasi silliq,
 * uchlari yumaloq va foiz o'zgarganda animatsiya bilan siljiydi.
 *
 * Rang `readinessFromScore` dan keladi, ya'ni ustoz va direktor panelidagi
 * "Tayyor / Deyarli tayyor / Yordam kerak" yorlig'i bilan AYNI chegaradan.
 * Halqa yashil bo'lib, yonidagi yorliq sariq turishi mumkin emas.
 */
const STROKE_COLOR: Record<BadgeVariant, string> = {
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  brand: "var(--brand)",
  neutral: "var(--text-faint)",
};

const SIZE = 148;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ProgressRing({ score }: { score: number | null }) {
  const readiness = readinessFromScore(score);
  const pct = score ?? 0;
  // Halqa 12 soat yo'nalishidan boshlanadi (-90°), ya'ni odam foizni
  // tepadan o'qiy boshlaydi.
  const offset = CIRCUMFERENCE * (1 - pct / 100);

  return (
    <div
      className="relative shrink-0"
      style={{ width: SIZE, height: SIZE }}
      role="img"
      aria-label={
        score === null
          ? "Imtihon topshirilmagan"
          : `Imtihon o'rtacha bali ${score} foiz — ${readiness.label}`
      }
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={STROKE}
        />
        {score !== null && (
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={STROKE_COLOR[readiness.variant]}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            style={{ transition: "stroke-dashoffset 600ms ease-out" }}
          />
        )}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-6 text-center">
        {score === null ? (
          <span className="text-[13px] font-semibold leading-snug text-text-muted">
            Imtihon topshirilmagan
          </span>
        ) : (
          <>
            <span className="font-display text-[38px] font-extrabold leading-none tracking-tight text-text tabular-nums">
              {score}
              <span className="text-xl text-text-faint">%</span>
            </span>
            <span
              className="text-[12px] font-semibold"
              style={{ color: STROKE_COLOR[readiness.variant] }}
            >
              {readiness.label}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
