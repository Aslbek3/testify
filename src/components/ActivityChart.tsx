import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/cn";
import type { DailyActivityPoint } from "@/services/directorDashboard";

/**
 * Kunlik faollik grafigi.
 *
 * Kutubxonasiz, sof SVG: bizga bitta chiziqli grafik kerak, `recharts`
 * esa ~100 KB va butun React daraxtini o'z ichiga oladi. Bu yerda
 * hisob-kitob o'n qatorga sig'adi va komponent SERVER tomonda chiziladi —
 * klientga faqat tayyor SVG boradi.
 *
 * O'lchov — noyob o'quvchilar soni, urinishlar emas (`getDailyActivity`
 * izohiga qara).
 */

/** Grafikning ichki koordinata tizimi. Piksel emas — `viewBox` birliklari. */
const VIEW = { width: 700, height: 190 };
/** O'ng chekkadagi nuqta kesilib qolmasligi uchun chetdan bo'shliq. */
const PADDING = 6;

const PERIODS = [7, 30, 90] as const;
export type ActivityPeriod = (typeof PERIODS)[number];

export function parseActivityPeriod(value: string | undefined): ActivityPeriod {
  const parsed = Number(value);
  return PERIODS.includes(parsed as ActivityPeriod) ? (parsed as ActivityPeriod) : 7;
}

/** "5-sen" ko'rinishidagi qisqa sana — o'q yorlig'i uchun. */
const MONTH_SHORT = [
  "yan", "fev", "mar", "apr", "may", "iyun",
  "iyul", "avg", "sen", "okt", "noy", "dek",
];

function shortDate(date: Date): string {
  // `getDailyActivity` kun boshini O'zbekiston vaqti bo'yicha qaytaradi,
  // shuning uchun bu yerda ham UTC+5 ga siljitib o'qiladi — server va
  // brauzer bir xil satr hosil qilsin (hidratsiya).
  const shifted = new Date(date.getTime() + 5 * 60 * 60 * 1000);
  return `${shifted.getUTCDate()}-${MONTH_SHORT[shifted.getUTCMonth()]}`;
}

export function ActivityChart({
  points,
  period,
  basePath,
  /** Davr almashganda saqlanadigan boshqa URL parametrlari. */
  keepParams,
}: {
  points: DailyActivityPoint[];
  period: ActivityPeriod;
  basePath: string;
  keepParams?: Record<string, string | undefined>;
}) {
  const maxValue = Math.max(...points.map((p) => p.studentCount), 0);
  const total = points.reduce((sum, p) => sum + p.studentCount, 0);

  // Shkala tepasi — eng katta qiymatdan biroz baland va butun songa
  // yaxlitlangan, aks holda grafik yuqori chekkaga yopishib qolardi.
  const scaleMax = maxValue === 0 ? 4 : Math.ceil((maxValue * 1.15) / 2) * 2;

  function hrefFor(next: ActivityPeriod): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(keepParams ?? {})) {
      if (value) params.set(key, value);
    }
    if (next !== 7) params.set("kun", String(next));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  const stepX =
    points.length > 1 ? (VIEW.width - PADDING * 2) / (points.length - 1) : 0;

  const coords = points.map((point, index) => ({
    x: PADDING + index * stepX,
    y:
      VIEW.height -
      PADDING -
      (point.studentCount / scaleMax) * (VIEW.height - PADDING * 2),
    point,
  }));

  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");
  const areaPath =
    coords.length > 0
      ? `${linePath} L${coords[coords.length - 1].x.toFixed(1)} ${VIEW.height} L${coords[0].x.toFixed(1)} ${VIEW.height} Z`
      : "";

  // Nuqtalar faqat 7 kunlik ko'rinishda: 90 ta nuqta chiziqni butunlay
  // bosib qo'yadi va hech narsa o'qilmaydi.
  const showDots = points.length <= 14;

  // O'q yorliqlari — ko'pi bilan 6 ta, aks holda ular bir-biriga yopishadi.
  const labelStep = Math.max(1, Math.ceil(points.length / 6));
  const xLabels = points.filter((_, i) => i % labelStep === 0 || i === points.length - 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle icon="trendUp">O&apos;quvchilar faolligi</CardTitle>

        {/* Davr kaliti — oddiy havolalar, ya'ni holat URL'da qoladi va
            "orqaga" tugmasi ishlaydi. */}
        <div className="flex gap-1 rounded-md bg-surface-2 p-1">
          {PERIODS.map((value) => (
            <Link
              key={value}
              href={hrefFor(value)}
              aria-current={value === period ? "true" : undefined}
              className={cn(
                "rounded-sm px-3 py-1.5 text-[12px] font-semibold transition-colors",
                value === period
                  ? "bg-brand text-white"
                  : "text-text-muted hover:text-text"
              )}
            >
              {value} kun
            </Link>
          ))}
        </div>
      </CardHeader>

      {total === 0 ? (
        <EmptyState
          icon="chart"
          title="Bu davrda faollik bo'lmagan"
          description="Grafik test ishlagan o'quvchilar sonini kun bo'yicha ko'rsatadi. O'quvchilar test boshlaganda u to'lib boradi."
        />
      ) : (
        <>
          <div className="flex gap-3">
            {/* Y o'qi — uchta qiymat yetarli: tepa, o'rta, nol. */}
            <div className="flex w-8 shrink-0 flex-col justify-between pb-5 text-right font-mono text-[11px] tabular-nums text-text-faint">
              <span>{scaleMax}</span>
              <span>{scaleMax / 2}</span>
              <span>0</span>
            </div>

            <div className="min-w-0 flex-1">
              <svg
                viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
                preserveAspectRatio="none"
                className="h-[190px] w-full"
                role="img"
                aria-label={`Kunlik faollik: ${points.length} kun, eng yuqori ${maxValue} o'quvchi`}
              >
                <defs>
                  <linearGradient id="activity-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Yo'riqnoma chiziqlari — tepa, o'rta, past */}
                {[PADDING, VIEW.height / 2, VIEW.height - PADDING].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={y}
                    x2={VIEW.width}
                    y2={y}
                    stroke="var(--border-subtle)"
                    strokeWidth="1.5"
                  />
                ))}

                <path d={areaPath} fill="url(#activity-fill)" />
                <path
                  d={linePath}
                  fill="none"
                  stroke="var(--brand)"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  // `preserveAspectRatio="none"` chiziqni gorizontal
                  // cho'zadi — usiz qalinlik ham cho'zilib, chiziq
                  // notekis ko'rinardi.
                  vectorEffect="non-scaling-stroke"
                />

                {showDots &&
                  coords.map((c) => (
                    <circle
                      key={c.point.date.getTime()}
                      cx={c.x}
                      cy={c.y}
                      r="4"
                      fill="var(--brand)"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
              </svg>

              <div className="mt-1.5 flex justify-between font-mono text-[11px] tabular-nums text-text-faint">
                {xLabels.map((point) => (
                  <span key={point.date.getTime()}>{shortDate(point.date)}</span>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-3 text-[12px] text-text-faint">
            Kuniga eng ko&apos;pi bilan{" "}
            <span className="font-mono font-semibold text-text">{maxValue}</span>{" "}
            o&apos;quvchi test ishlagan. O&apos;lchov — noyob o&apos;quvchilar
            soni, urinishlar emas.
          </p>
        </>
      )}
    </Card>
  );
}
