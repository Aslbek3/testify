import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { TaskCard } from "@/components/TaskCard";
import { StatTile } from "@/components/StatTile";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/Badge";
import { Icon } from "@/components/Icon";
import { CompareBar, CompareLegend } from "@/components/CompareBar";
import { getGroupSummariesForTutor } from "@/services/tutorDashboard";
import { getTutorTasks } from "@/services/tasks";
import { getUserName } from "@/services/users";
import { readinessFromScore } from "@/lib/readiness";
import { formatRelativeDays } from "@/lib/format";

/**
 * Ustoz paneli — guruhlar ro'yxati va bugungi ish.
 *
 * Ilgari bu sahifa BITTA guruhning paneli edi, guruh esa yuqoridagi
 * ochiladigan ro'yxatdan tanlanardi. Endi har bir guruh o'z sahifasiga ega
 * (`/guruh/[id]`), bu yerda esa ularning qisqa ko'rsatkichlari yonma-yon
 * turadi — bir nechta guruhi bor ustoz qaysi biriga e'tibor berish
 * kerakligini bir qarashda ko'radi.
 *
 * Guruhlar JADVAL emas, KARTOCHKA: ustozda guruh kam (odatda 1-4 ta) va
 * har birini taqqoslash shkalasi bilan ko'rsatish jadval qatoridan
 * aniqroq. Ko'p qatorli taqqoslash direktor jurnalining ishi.
 */
export default async function TutorPage() {
  const user = await requireRole("TUTOR");
  const [groups, userName] = await Promise.all([
    getGroupSummariesForTutor(user.id),
    getUserName(user.id),
  ]);

  // Bitta guruhi bor ustoz uchun ro'yxat ortiqcha bosish bo'lardi — u
  // to'g'ridan-to'g'ri guruh sahifasiga o'tadi.
  if (groups.length === 1) redirect(`/guruh/${groups[0].id}`);

  if (groups.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader
          title={userName ? `Xush kelibsiz, ${userName}` : "Ustoz paneli"}
          description="Guruhingizdagi o'quvchilarning progressini shu yerdan kuzatasiz."
        />
        <Card>
          <EmptyState
            icon="building"
            title="Guruh biriktirilmagan"
            description="Sizga hali o'quvchilar guruhi biriktirilmagan. Statistikani ko'rish uchun direktoringiz sizga guruh biriktirishi kerak."
          />
        </Card>
      </div>
    );
  }

  const tasks = await getTutorTasks(user.id);

  const studentCount = groups.reduce((sum, g) => sum + g.studentCount, 0);
  const recentExamCount = groups.reduce((sum, g) => sum + g.recentExamCount, 0);
  const scored = groups.filter((g) => g.averageScore !== null);
  // Ustozning O'Z guruhlari bo'yicha o'rtacha — taqqoslash chizig'i shu
  // yerda turadi. Kartochkada "qaysi guruhim orqada?" degan savolga javob
  // beradi; avtomaktab o'rtachasi bu yerda kerak emas, u direktorning
  // savoli.
  const ownAverage =
    scored.length > 0
      ? Math.round(
          scored.reduce((sum, g) => sum + (g.averageScore ?? 0), 0) / scored.length
        )
      : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={userName ? `Xush kelibsiz, ${userName}` : "Guruhlarim"}
        description="Guruhni bosing — o'quvchilar, vazifalar va mavzular tahlili ochiladi."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3.5">
            <StatTile
              icon="building"
              tone="brand"
              label="Guruhlarim"
              value={groups.length}
            />
            <StatTile
              icon="users"
              tone="info"
              label="O'quvchilar"
              value={studentCount}
            />
            <StatTile
              icon="clipboardCheck"
              tone="purple"
              label="Hafta imtihonlari"
              value={recentExamCount}
              sub="Yakunlanganlari"
            />
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            {groups.map((group) => {
              const readiness = readinessFromScore(group.averageScore);
              return (
                <Link
                  key={group.id}
                  href={`/guruh/${group.id}`}
                  className="flex flex-col rounded-lg border border-border bg-bg p-5 shadow-card transition-all hover:border-brand/40 hover:shadow-raised"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-display text-base font-bold text-text">
                        {group.name}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-text-muted">
                        {group.studentCount} o&apos;quvchi ·{" "}
                        {group.recentExamCount} hafta imtihoni
                      </span>
                    </span>
                    <Badge variant={readiness.variant}>{readiness.label}</Badge>
                  </div>

                  <div className="mt-4">
                    <CompareBar value={group.averageScore} average={ownAverage} />
                  </div>

                  <span className="mt-3.5 flex items-center gap-1.5 text-[11.5px] text-text-faint">
                    <Icon name="clock" className="h-3.5 w-3.5" />
                    So&apos;nggi faollik: {formatRelativeDays(group.lastActivityAt)}
                  </span>
                </Link>
              );
            })}
          </div>

          {ownAverage !== null && (
            <CompareLegend average={ownAverage} label="Guruhlaringiz o'rtachasi" />
          )}
        </div>

        <TaskCard
          tasks={tasks}
          emptyDescription="Muddati yaqin vazifa ham, e'tibor talab qiladigan o'quvchi ham yo'q."
        />
      </div>
    </div>
  );
}
