import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getAttemptResult, AttemptError } from "@/services/attempts";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Badge } from "@/components/Badge";
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

  const modeLabel = result.mode === "EXAM" ? "Imtihon" : "Mashq";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text">{modeLabel} natijasi</h1>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-text-muted">Natija</p>
            <p className="font-mono text-4xl font-semibold text-text">
              {result.totalCount} tadan {result.correctCount} tasi to&apos;g&apos;ri
            </p>
            <p className="mt-1 font-mono text-sm text-text-muted">{result.score}%</p>
          </div>
          {result.passed !== null && (
            <Badge variant={result.passed ? "success" : "danger"}>
              {result.passed ? "O'tdi" : "O'tmadi"}
            </Badge>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mavzular bo&apos;yicha taqsimot</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          {result.topicBreakdown.map((topic) => {
            const percent = Math.round((topic.correct / topic.total) * 100);
            return (
              <div key={topic.topicId} className="flex items-center gap-4">
                <span className="w-40 shrink-0 truncate text-sm text-text">
                  {topic.topicName}
                </span>
                <div className="h-2 flex-1 rounded-full bg-bg-subtle">
                  <div
                    className={cn("h-2 rounded-full", topicBarColor(percent))}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="font-mono text-sm text-text-muted">
                  {topic.correct}/{topic.total}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Xato qilingan savollar</CardTitle>
          <span className="text-sm text-text-muted">
            {result.missedQuestions.length} ta
          </span>
        </CardHeader>

        {result.missedQuestions.length === 0 ? (
          <p className="text-sm text-text-muted">
            Barcha savollarga to&apos;g&apos;ri javob berdingiz!
          </p>
        ) : (
          <ul className="space-y-4">
            {result.missedQuestions.map((question) => (
              <li key={question.questionId} className="rounded-md border border-border p-4">
                <p className="font-medium text-text">{question.text}</p>
                <p className="mt-2 text-sm text-danger">
                  Sizning javobingiz:{" "}
                  {question.selectedOptionText ?? "Javob berilmagan"}
                </p>
                <p className="text-sm text-success">
                  To&apos;g&apos;ri javob: {question.correctOptionText}
                </p>
                {question.explanation && (
                  <p className="mt-2 text-sm text-text-muted">{question.explanation}</p>
                )}
              </li>
            ))}
          </ul>
        )}
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
