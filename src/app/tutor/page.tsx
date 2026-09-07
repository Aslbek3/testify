import { requireRole } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { StatTile } from "@/components/StatTile";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import {
  getGroupsForTutor,
  getGroupAnalytics,
  getRosterForGroup,
  getRecentExamAttemptCount,
} from "@/services/tutorDashboard";
import { GroupSelect } from "./GroupSelect";
import { RosterTable } from "./RosterTable";
import { NewStudentModal } from "./NewStudentModal";

function severityClass(errorRatePercent: number): string {
  if (errorRatePercent < 15) return "bg-success";
  if (errorRatePercent <= 30) return "bg-warning";
  return "bg-danger";
}

export default async function TutorPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const user = await requireRole("TUTOR");
  const { group: groupParam } = await searchParams;

  const groups = await getGroupsForTutor(user.id);

  if (groups.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-text">Ustoz paneli</h1>
          <p className="mt-1 text-sm text-text-muted">
            Guruhingiz qaysi mavzularda ko&apos;p xato qilayotganini va har bir
            o&apos;quvchining progressini shu yerdan kuzatasiz.
          </p>
        </div>
        <Card className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border text-xl text-text-muted">
            —
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-text">
              Guruh biriktirilmagan
            </p>
            <p className="max-w-sm text-sm leading-relaxed text-text-muted">
              Sizga hali o&apos;quvchilar guruhi biriktirilmagan. Statistikani
              ko&apos;rish uchun direktoringiz sizga guruh biriktirishi kerak.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const selectedGroup = groups.find((g) => g.id === groupParam) ?? groups[0];

  // Mavzu bo'yicha xato foizi va eng ko'p xato qilingan savollar bitta
  // so'rovdan chiqadi — ilgari ikkalasi alohida chaqirilib, guruhning
  // butun javoblar jadvali har yuklanishda ikki marta tortilardi.
  const [analytics, roster, recentExamCount] = await Promise.all([
    getGroupAnalytics(selectedGroup.id),
    getRosterForGroup(selectedGroup.id),
    getRecentExamAttemptCount(selectedGroup.id),
  ]);
  const { topicErrorRates, mostMissedQuestions: missedQuestions } = analytics;

  const studentsWithScore = roster.filter((r) => r.averageScore !== null);
  const averageScore =
    studentsWithScore.length > 0
      ? Math.round(
          studentsWithScore.reduce((sum, r) => sum + (r.averageScore ?? 0), 0) /
            studentsWithScore.length
        )
      : null;
  const activeStudentCount = roster.filter((r) => r.isActive).length;
  const totalAttempts = roster.reduce(
    (sum, r) => sum + r.examAttemptCount + r.practiceAttemptCount,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Ustoz paneli</h1>
          <p className="mt-1 text-sm text-text-muted">
            Guruhingiz qaysi mavzularda ko&apos;p xato qilayotganini va har bir
            o&apos;quvchining progressini shu yerdan kuzatasiz.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {groups.length > 1 && (
            <GroupSelect groups={groups} selectedId={selectedGroup.id} />
          )}
          <NewStudentModal groups={groups} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.6fr_1fr_1fr]">
        <div className="rounded-lg border border-border bg-bg p-6">
          <p className="text-sm text-text-muted">Guruh o&apos;rtacha bali</p>
          <p className="mt-1.5 font-mono text-[52px] font-semibold leading-none text-brand">
            {averageScore !== null ? `${averageScore}%` : "—"}
          </p>
        </div>
        <StatTile label="Faol o'quvchilar" value={activeStudentCount} />
        <StatTile label="So'nggi hafta imtihonlar" value={recentExamCount} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mavzu bo&apos;yicha xato foizi</CardTitle>
          </CardHeader>
          {topicErrorRates.length === 0 ? (
            <p className="text-sm text-text-muted">
              Hali bu guruh bo&apos;yicha javob berilgan savollar yo&apos;q.
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
          </CardHeader>
          {missedQuestions.length === 0 ? (
            <p className="text-sm text-text-muted">
              Hali xato qilingan savollar yo&apos;q.
            </p>
          ) : (
            <ul className="space-y-3">
              {missedQuestions.map((q) => (
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

      <Card>
        <CardHeader>
          <CardTitle>O&apos;quvchilar</CardTitle>
          <span className="text-sm text-text-muted">
            {totalAttempts} ta urinish · Qatorni bosing — to&apos;liq progress ochiladi
          </span>
        </CardHeader>
        <p className="mb-3 text-sm text-text-muted">
          O&apos;quvchining guruhini o&apos;zgartirish kerak bo&apos;lsa, direktorga
          murojaat qiling.
        </p>
        <RosterTable roster={roster} />
      </Card>
    </div>
  );
}
