import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { describeAssignmentDue } from "@/lib/assignments";
import { formatDate } from "@/lib/format";
import type { StudentAssignment } from "@/services/assignments";

/**
 * O'quvchi panelidagi "Vazifalarim". Vazifa bo'lmasa umuman chizilmaydi —
 * ustozi vazifa bermaydigan o'quvchi uchun bo'sh kartochka faqat joy oladi.
 */
export function StudentAssignmentsCard({ assignments }: { assignments: StudentAssignment[] }) {
  if (assignments.length === 0) return null;
  const now = new Date();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vazifalarim</CardTitle>
        <span className="text-sm text-text-muted">Ustozingiz bergan</span>
      </CardHeader>
      <ul className="divide-y divide-border">
        {assignments.map((a) => {
          const due = describeAssignmentDue(a.dueAt, now);
          const percent = Math.min(100, Math.round((a.doneCount / a.targetCount) * 100));
          return (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="font-medium text-text">{a.title}</p>
                {a.note && <p className="text-sm text-text-muted">{a.note}</p>}
                <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
                  <span>
                    Muddat:{" "}
                    <span className="font-mono tabular-nums text-text">{formatDate(a.dueAt)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-20 rounded-full bg-bg-subtle">
                      <span
                        className="block h-2 rounded-full bg-success"
                        style={{ width: `${percent}%` }}
                      />
                    </span>
                    <span className="font-mono tabular-nums text-text">
                      {a.doneCount} / {a.targetCount}
                    </span>
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {a.isDone ? (
                  <Badge variant="success">Bajarildi</Badge>
                ) : (
                  <Badge variant={due.variant}>{due.label}</Badge>
                )}
                {/* Muddati o'tgan vazifani boshlab bo'lmaydi (server ham
                    rad etadi); bajarilganini esa yana ishlash mumkin. */}
                {!a.isOverdue && (
                  <Link href={`/student/test?vazifa=${a.id}`}>
                    <Button type="button" variant={a.isDone ? "secondary" : "primary"}>
                      {a.isDone ? "Yana ishlash" : "Boshlash"}
                    </Button>
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
