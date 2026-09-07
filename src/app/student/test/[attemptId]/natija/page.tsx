import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getAttemptResult, AttemptError } from "@/services/attempts";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { cn } from "@/lib/cn";
import { ResultReview } from "./ResultReview";

function topicBarColor(percent: number): string {
  if (percent >= 85) return "bg-success";
  if (percent >= 65) return "bg-warning";
  return "bg-danger";
}

export default async function AttemptResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const user = await requireRole("STUDENT");
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card className="flex flex-col gap-7 p-8">
        <div className="flex flex-col items-center gap-2 py-3 text-center">
          {result.passed !== null && (
            <p
              className={cn(
                "text-sm font-semibold tracking-wide",
                result.passed ? "text-success" : "text-danger"
              )}
            >
              {result.passed ? "O'TDI" : "YIQILDI"}
            </p>
          )}
          <p className="font-mono text-[44px] font-semibold leading-none text-text">
            {result.correctCount}
            <span className="text-2xl text-text-muted">/{result.totalCount}</span>
          </p>
          <p className="text-sm text-text-muted">
            {result.totalCount} tadan {result.correctCount} tasi to&apos;g&apos;ri
            {result.passed === false && result.passThreshold !== null && (
              <> — kamida {result.passThreshold} ta kerak</>
            )}
          </p>
        </div>

        {/* Uchta raqam ATAYLAB alohida: "xato" va "javobsiz" ball uchun bir
            xil bo'lsa-da, ustoz uchun butunlay boshqa muammo — birinchisi
            bilim, ikkinchisi vaqtni boshqarish masalasi. Uchtasi qo'shilib
            doim jamiga teng chiqadi (getAttemptResult buni kafolatlaydi). */}
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ["To'g'ri", result.correctCount, "text-success"],
              ["Xato", result.wrongCount, "text-danger"],
              ["Javobsiz", result.unansweredCount, "text-warning"],
            ] as const
          ).map(([label, value, colorClass]) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 rounded-md border border-border py-4"
            >
              <span className={cn("font-mono text-2xl font-semibold", colorClass)}>
                {value}
              </span>
              <span className="text-xs text-text-muted">{label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-text">Mavzular bo&apos;yicha taqsimot</p>
          <div className="flex flex-col gap-2.5">
            {result.topicBreakdown.map((topic) => {
              const percent = Math.round((topic.correct / topic.total) * 100);
              return (
                <div key={topic.topicId} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm text-text">
                    <span>{topic.topicName}</span>
                    <span className="font-mono text-text-muted">
                      {topic.correct}/{topic.total}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-subtle">
                    <div
                      className={cn("h-1.5 rounded-full", topicBarColor(percent))}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <ResultReview questions={result.reviewQuestions} />
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link href={`/student/test?mode=${result.mode}`}>
          <Button type="button">Qayta urinish</Button>
        </Link>
        <Link href="/student">
          <Button type="button" variant="secondary">
            Bosh sahifaga qaytish
          </Button>
        </Link>
      </div>
    </div>
  );
}
