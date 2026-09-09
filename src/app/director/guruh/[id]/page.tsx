import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { canViewGroup } from "@/lib/permissions";
import {
  getGroupDetail,
  listTutorsForOrganization,
  GROUP_NAME_MAX_LENGTH,
} from "@/services/directorDashboard";
import { averageScoreFromRoster } from "@/services/tutorDashboard";
import {
  getGroupAnalytics,
  getRosterForGroup,
  getRecentExamAttemptCount,
} from "@/services/tutorDashboard";
import { StatTile } from "@/components/StatTile";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { GroupRosterTable } from "../../GroupRosterTable";
import { GroupAnalyticsCards } from "@/components/GroupAnalyticsCards";
import { EditGroupButton } from "../../EditGroupButton";

export default async function DirectorGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("DIRECTOR");
  const { id: groupId } = await params;

  const group = await getGroupDetail(groupId);
  // Boshqa tashkilotning guruhi ham, umuman mavjud bo'lmagan ID ham AYNI
  // natijani beradi (404) — aks holda direktor ID'larni sinab ko'rib,
  // boshqa avtomaktabda qaysi guruhlar borligini aniqlay olardi.
  if (!group || !canViewGroup(user, group)) notFound();

  const [roster, analytics, recentExamCount, tutors] = await Promise.all([
    getRosterForGroup(groupId),
    getGroupAnalytics(groupId),
    getRecentExamAttemptCount(groupId),
    listTutorsForOrganization(group.organizationId),
  ]);

  const averageScore = averageScoreFromRoster(roster);
  const totalAttempts = roster.reduce(
    (sum, r) => sum + r.examAttemptCount + r.practiceAttemptCount,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/director"
            className="text-sm text-text-muted hover:text-text hover:underline"
          >
            ← Guruhlar
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-text">{group.name}</h1>
          <p className="mt-1 text-sm text-text-muted">
            Ustoz: {group.tutorName} · {group.studentCount} ta o&apos;quvchi
          </p>
        </div>
        <EditGroupButton
          group={{
            groupId: group.id,
            groupName: group.name,
            tutorId: group.tutorId,
          }}
          tutors={tutors}
          nameMaxLength={GROUP_NAME_MAX_LENGTH}
        />
      </div>

      {/* "primary" plitka ikki ustunni egallaydi — jami to'rtta katak. */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile
          emphasis="primary"
          label="Guruh o'rtacha bali"
          value={averageScore === null ? "—" : `${averageScore}%`}
          sub={
            averageScore === null
              ? "Imtihon topshirilmagan"
              : "Yakunlangan imtihonlar bo'yicha"
          }
        />
        <StatTile label="O'quvchilar" value={group.studentCount} />
        <StatTile
          label="So'nggi hafta imtihonlar"
          value={recentExamCount}
          sub="Yakunlanganlari"
        />
      </div>

      <GroupAnalyticsCards analytics={analytics} />

      <Card>
        <CardHeader>
          <CardTitle>O&apos;quvchilar</CardTitle>
          <span className="text-sm text-text-muted">
            {totalAttempts} ta yakunlangan urinish
          </span>
        </CardHeader>
        <p className="mb-3 text-sm text-text-muted">
          Jadvaldagi sonlar faqat SHU guruhdagi urinishlarni ko&apos;rsatadi:
          o&apos;quvchi boshqa guruhdan ko&apos;chirilgan bo&apos;lsa, uning
          eski natijalari eski guruhida qoladi. Hisobni bloklash, parolni
          tiklash va guruhni o&apos;zgartirish{" "}
          <Link
            href="/director/oquvchilar"
            className="text-brand hover:underline"
          >
            O&apos;quvchilar
          </Link>{" "}
          bo&apos;limida.
        </p>
        <GroupRosterTable roster={roster} />
      </Card>
    </div>
  );
}
