import { requireRole } from "@/lib/auth";
import { StatTile } from "@/components/StatTile";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/Table";
import { Badge } from "@/components/Badge";
import type { BadgeVariant } from "@/components/Badge";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  getStudentOverview,
  getMasteryByTopic,
  getAttemptHistory,
} from "@/services/studentDashboard";
import { ProgressRing } from "./ProgressRing";

function masteryVariant(pct: number): BadgeVariant {
  if (pct >= 85) return "success";
  if (pct >= 65) return "warning";
  return "danger";
}

function masteryBarColor(pct: number): string {
  if (pct >= 85) return "bg-success";
  if (pct >= 65) return "bg-warning";
  return "bg-danger";
}

export default async function StudentPage() {
  const user = await requireRole("STUDENT");

  const [overview, mastery, history] = await Promise.all([
    getStudentOverview(user.id),
    getMasteryByTopic(user.id),
    getAttemptHistory(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text">O&apos;quvchi paneli</h1>
        <p className="mt-1 text-sm text-text-muted">
          O&apos;zingizning tayyorgarlik darajangiz, mavzular bo&apos;yicha bilim
          darajasi va urinishlar tarixi shu yerda.
        </p>
      </div>

      <Card>
          <div className="flex flex-wrap items-center gap-8">
            <ProgressRing score={overview.overallScore} />
            <div className="grid flex-1 grid-cols-2 gap-4 sm:max-w-md">
              <StatTile label="Jami urinishlar" value={overview.attemptCount} />
              <StatTile label="Guruh" value={overview.groupName ?? "—"} />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mavzular bo&apos;yicha bilim darajasi</CardTitle>
          </CardHeader>

          {mastery.length === 0 ? (
            <p className="text-sm text-text-muted">
              Hali hech qanday mavzu bo&apos;yicha ma&apos;lumot yo&apos;q.
            </p>
          ) : (
            <div className="space-y-3">
              {mastery.map((topic) => (
                <div key={topic.topicId} className="flex items-center gap-4">
                  <span className="w-48 shrink-0 truncate text-sm text-text">
                    {topic.topicName}
                  </span>
                  <div className="h-2 flex-1 rounded-full bg-bg-subtle">
                    <div
                      className={cn("h-2 rounded-full", masteryBarColor(topic.masteryPercent))}
                      style={{ width: `${topic.masteryPercent}%` }}
                    />
                  </div>
                  <Badge variant={masteryVariant(topic.masteryPercent)}>
                    <span className="font-mono">{topic.masteryPercent}%</span>
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Urinishlar tarixi</CardTitle>
          </CardHeader>

          {history.length === 0 ? (
            <p className="text-sm text-text-muted">Hali urinish qilinmagan.</p>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Sana</TableHeaderCell>
                  <TableHeaderCell align="right">Savollar soni</TableHeaderCell>
                  <TableHeaderCell align="right">Ball</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell>{formatDate(attempt.date)}</TableCell>
                    <TableCell align="right">{attempt.questionCount}</TableCell>
                    <TableCell align="right">
                      {attempt.score === null ? (
                        <Badge variant="brand">Davom etmoqda</Badge>
                      ) : (
                        `${attempt.score}%`
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
    </div>
  );
}
