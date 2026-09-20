import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireActiveStudent } from "@/lib/auth";
import { getAttemptResult, AttemptError } from "@/services/attempts";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/cn";
import { readinessFromScore } from "@/lib/readiness";
import { BADGE_SOLID_CLASS } from "@/components/Badge";
import { ResultReview } from "./ResultReview";

export default async function AttemptResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const user = await requireActiveStudent();
  const { attemptId } = await params;

  let result;
  try {
    result = await getAttemptResult({ user, attemptId });
  } catch (error) {
    if (error instanceof AttemptError) {
      if (error.status === 409) {
        // Hali yakunlanmagan — davom ettirish sahifasiga.
        redirect(`/student/test?attemptId=${attemptId}`);
      }
      notFound();
    }
    throw error;
  }

  const percent =
    result.totalCount > 0
      ? Math.round((result.correctCount / result.totalCount) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Natijaning o'zi — sahifadagi yagona to'q blok. O'quvchi ekranni
          ochganda birinchi ko'radigan narsa "o'tdimmi?" degan savolga
          javob bo'lishi kerak, mayda raqamlar emas. */}
      <div
        className={cn(
          "relative overflow-hidden rounded-xl p-7 text-center text-white shadow-raised",
          result.passed === false ? "bg-danger" : "bg-navy"
        )}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full border border-white/15"
        />

        {result.passed !== null && (
          // ATAYLAB katta harflarda EMAS (CLAUDE.md dizayn qoidasi).
          // Ilgari bu yerda "O'TDI" / "YIQILDI" turardi.
          <p
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-bold",
              result.passed ? "bg-brand text-white" : "bg-white/20 text-white"
            )}
          >
            <Icon
              name={result.passed ? "check" : "x"}
              className="h-3.5 w-3.5"
            />
            {result.passed ? "O'tdingiz" : "Yiqildingiz"}
          </p>
        )}

        <p className="mt-4 font-display text-[52px] font-extrabold leading-none tracking-[-0.045em] tabular-nums">
          {result.correctCount}
          <span className="text-[28px] text-white/50">/{result.totalCount}</span>
        </p>

        <p className="mt-2 text-[13px] leading-relaxed text-white/70">
          {result.totalCount} tadan {result.correctCount} tasi to&apos;g&apos;ri —{" "}
          <span className="font-semibold text-white">{percent}%</span>
          {result.passed === false && result.passThreshold !== null && (
            <> · o&apos;tish uchun kamida {result.passThreshold} ta kerak</>
          )}
        </p>
      </div>

      {/* Uchta raqam ATAYLAB alohida: "xato" va "javobsiz" ball uchun bir
          xil bo'lsa-da, ustoz uchun butunlay boshqa muammo — birinchisi
          bilim, ikkinchisi vaqtni boshqarish masalasi. Uchtasi qo'shilib
          doim jamiga teng chiqadi (getAttemptResult buni kafolatlaydi). */}
      <div className="grid grid-cols-3 gap-3.5">
        {(
          [
            ["To'g'ri", result.correctCount, "check", "bg-brand-soft text-brand"],
            ["Xato", result.wrongCount, "x", "bg-danger-soft text-danger"],
            [
              "Javobsiz",
              result.unansweredCount,
              "clock",
              "bg-warning-soft text-warning",
            ],
          ] as const
        ).map(([label, value, icon, tone]) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-bg py-4 shadow-card"
          >
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full",
                tone
              )}
            >
              <Icon name={icon} className="h-4 w-4" />
            </span>
            <span className="font-display text-[22px] font-bold tabular-nums text-text">
              {value}
            </span>
            <span className="text-[11.5px] text-text-muted">{label}</span>
          </div>
        ))}
      </div>

      <Card className="space-y-5">
        <div className="space-y-3">
          <p className="flex items-center gap-2 font-display text-[15px] font-bold text-text">
            <Icon name="chart" className="h-[18px] w-[18px] text-text-faint" />
            Mavzular bo&apos;yicha taqsimot
          </p>
          <div className="space-y-3">
            {result.topicBreakdown.map((topic) => {
              const topicPercent = Math.round((topic.correct / topic.total) * 100);
              // Rang `readinessFromScore` dan — o'quvchi panelidagi mavzu
              // shkalasi bilan AYNI chegara. Ilgari bu yerda o'zining
              // 85/65 sehrli raqamlari turardi va bitta mavzu natija
              // ekranida yashil, panelda esa sariq ko'rinishi mumkin edi.
              const variant = readinessFromScore(topicPercent).variant;
              return (
                <div key={topic.topicId} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-[13px] font-medium text-text">
                      {topic.topicName}
                    </span>
                    <span className="shrink-0 font-mono text-[13px] font-semibold tabular-nums text-text-muted">
                      {topic.correct}/{topic.total}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={cn("h-full rounded-full", BADGE_SOLID_CLASS[variant])}
                      style={{ width: `${topicPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <ResultReview questions={result.reviewQuestions} />
      </Card>

      <div className="flex flex-wrap gap-2.5">
        <Link href={`/student/test?mode=${result.mode}`}>
          <Button type="button" icon="refresh">
            Qayta urinish
          </Button>
        </Link>
        {/* Xato bo'lsa — ular ustida ishlash eng foydali keyingi qadam,
            yana o'sha testni qaytarishdan ko'ra. */}
        {result.wrongCount > 0 && (
          <Link href="/student/test?xatolar=1">
            <Button type="button" variant="secondary" icon="alertTriangle">
              Xatolar ustida ishlash
            </Button>
          </Link>
        )}
        <Link href="/student">
          <Button type="button" variant="ghost">
            Bosh sahifaga
          </Button>
        </Link>
      </div>
    </div>
  );
}
