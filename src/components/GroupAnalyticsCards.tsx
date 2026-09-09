import { cn } from "@/lib/cn";
import { readinessFromScore } from "@/lib/readiness";
import { BADGE_SOLID_CLASS } from "@/components/Badge";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import type { GroupAnalytics } from "@/services/tutorDashboard";

/**
 * Mavzu xato foizining rangi tayyorgarlik chegaralaridan kelib chiqadi:
 * xato foizi = 100 - o'zlashtirish foizi. Ustoz panelidagi bilan AYNI
 * qoida — chegara faqat `readiness.ts` da (ya'ni `EXAM_PASS_PERCENT` da)
 * turadi, shu yerda takrorlanmaydi.
 */
function severityClass(errorRatePercent: number): string {
  return BADGE_SOLID_CLASS[readinessFromScore(100 - errorRatePercent).variant];
}

/**
 * Guruhning mavzu bo'yicha xato foizi va eng ko'p xato qilingan savollari.
 *
 * Ma'lumot manbai ustoz panelidagi bilan bitta funksiya
 * (`getGroupAnalytics`) — direktor va ustoz hech qachon bir xil guruh
 * uchun boshqa-boshqa raqam ko'rmaydi.
 */
export function GroupAnalyticsCards({ analytics }: { analytics: GroupAnalytics }) {
  const { topicErrorRates, mostMissedQuestions } = analytics;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Mavzu bo&apos;yicha xato foizi</CardTitle>
          {/* Ikkala kartochka bitta ekranda turgani va HAR XIL qoidada
              hisoblangani uchun manba ochiq yozilgan. */}
          <span className="text-sm text-text-muted">Javobsizlar ham xato</span>
        </CardHeader>
        {topicErrorRates.length === 0 ? (
          <p className="text-sm text-text-muted">
            Imtihon topshirilmagan — mavzu tahlili shu guruhda yakunlangan
            imtihon natijalari asosida hisoblanadi.
          </p>
        ) : (
          <div className="space-y-3">
            {topicErrorRates.map((t) => (
              <div
                key={t.topicId}
                className="grid grid-cols-[140px_1fr_36px] items-center gap-3"
              >
                <span className="truncate text-xs text-text-muted">{t.topicName}</span>
                <div className="h-1.5 rounded-full bg-bg-subtle">
                  <div
                    className={cn("h-1.5 rounded-full", severityClass(t.errorRatePercent))}
                    style={{ width: `${t.errorRatePercent}%` }}
                  />
                </div>
                <span className="text-right font-mono text-xs text-text">
                  {t.errorRatePercent}%
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eng ko&apos;p xato qilingan savollar</CardTitle>
          {/* Bu ro'yxatda javobsizlar ataylab sanalmaydi — batafsil izoh
              `getGroupAnalytics` da. */}
          <span className="text-sm text-text-muted">Javob berilganlar orasida</span>
        </CardHeader>
        {mostMissedQuestions.length === 0 ? (
          <p className="text-sm text-text-muted">
            Imtihon topshirilmagan — ro&apos;yxat shu guruhda yakunlangan
            imtihonlardagi javoblar asosida tuziladi.
          </p>
        ) : (
          <ul className="space-y-3">
            {mostMissedQuestions.map((q) => (
              <li key={q.questionId} className="rounded-md border border-border p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-brand">{q.topicName}</span>
                  <span className="font-mono text-sm font-semibold text-danger">
                    {q.missPercent}%
                  </span>
                </div>
                <p className="mt-1 text-sm text-text">{q.questionText}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
