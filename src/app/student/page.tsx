import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { StatTile } from "@/components/StatTile";
import { Button } from "@/components/Button";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Badge } from "@/components/Badge";
import type { BadgeVariant } from "@/components/Badge";
import { cn } from "@/lib/cn";
import {
  getStudentOverview,
  getMasteryByTopic,
  getAttemptHistory,
} from "@/services/studentDashboard";
import { finalizeExpiredAttempts } from "@/services/attempts";
import { ProgressRing } from "./ProgressRing";
import { AttemptHistoryTable } from "./AttemptHistoryTable";

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

  // Yorliq yopilib tashlab ketilgan imtihonlarni server tomonda hech kim
  // yopmaydi — shuning uchun panel yuklanishida "yalqov" yakunlaymiz.
  // Statistikani o'qishdan OLDIN turishi shart, aks holda endigina yopilgan
  // urinish shu sahifada hali ko'rinmay qoladi. Yakunlash faqat o'quvchining
  // o'zi ilovaga kirganda sodir bo'ladi: ustoz uni shu paytgacha
  // statistikada ko'rmasligi mumkin.
  await finalizeExpiredAttempts(user.id);

  const [overview, mastery, history] = await Promise.all([
    getStudentOverview(user.id),
    getMasteryByTopic(user.id),
    getAttemptHistory(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">O&apos;quvchi paneli</h1>
          <p className="mt-1 text-sm text-text-muted">
            O&apos;zingizning tayyorgarlik darajangiz, mavzular bo&apos;yicha bilim
            darajasi va urinishlar tarixi shu yerda.
          </p>
        </div>
        <Link href="/student/boshlash">
          <Button type="button">Test boshlash</Button>
        </Link>
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
            <AttemptHistoryTable history={history} />
          )}
        </Card>
    </div>
  );
}
