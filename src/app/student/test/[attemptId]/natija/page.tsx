import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getAttemptResult, AttemptError } from "@/services/attempts";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { cn } from "@/lib/cn";

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

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-text">Xato qilingan savollar</p>
          {result.missedQuestions.length === 0 ? (
            <p className="text-sm text-text-muted">
              Barcha savollarga to&apos;g&apos;ri javob berdingiz!
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border overflow-hidden rounded-md border border-border">
              {result.missedQuestions.map((question, index) => (
                <div key={question.questionId} className="flex flex-col gap-1.5 p-4">
                  <p className="text-sm text-text">
                    {index + 1}. {question.text}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span className="text-danger">
                      Sizning javobingiz:{" "}
                      {question.selectedOptionText ?? "Javob berilmagan"}
                    </span>
                    <span className="text-success">
                      To&apos;g&apos;ri javob: {question.correctOptionText}
                    </span>
                  </div>
                  {question.explanation && (
                    <p className="text-xs leading-relaxed text-text-muted">
                      {question.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
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
