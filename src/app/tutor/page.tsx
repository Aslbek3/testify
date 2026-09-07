import { requireRole } from "@/lib/auth";
import { StatTile } from "@/components/StatTile";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import {
  getGroupsForTutor,
  getTopicErrorRates,
  getMostMissedQuestions,
  getRosterForGroup,
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
        <Card>
          <p className="text-sm text-text-muted">
            Sizga hali guruh biriktirilmagan.
          </p>
        </Card>
      </div>
    );
  }

  const selectedGroup = groups.find((g) => g.id === groupParam) ?? groups[0];

  const [topicErrorRates, missedQuestions, roster] = await Promise.all([
    getTopicErrorRates(selectedGroup.id),
    getMostMissedQuestions(selectedGroup.id),
    getRosterForGroup(selectedGroup.id),
  ]);

  const studentsWithScore = roster.filter((r) => r.averageScore !== null);
  const averageScore =
    studentsWithScore.length > 0
      ? Math.round(
          studentsWithScore.reduce((sum, r) => sum + (r.averageScore ?? 0), 0) /
            studentsWithScore.length
        )
      : null;
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatTile
          emphasis="primary"
          label="O'rtacha ball"
          value={averageScore !== null ? `${averageScore}%` : "—"}
        />
        <StatTile label="Guruhdagi o'quvchilar" value={roster.length} />
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
                  className="grid grid-cols-[140px_1fr_44px] items-center gap-3"
                >
                  <span className="truncate text-sm text-text-muted">{t.topicName}</span>
                  <div className="h-4 rounded bg-bg-subtle">
                    <div
                      className={`h-4 rounded ${severityClass(t.errorRatePercent)}`}
                      style={{ width: `${t.errorRatePercent}%` }}
                    />
                  </div>
                  <span className="text-right font-mono text-sm tabular-nums text-text-muted">
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
