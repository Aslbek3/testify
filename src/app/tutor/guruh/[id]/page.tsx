import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { canViewGroup } from "@/lib/permissions";
import { getGroupDetail } from "@/services/directorDashboard";
import {
  getGroupAnalytics,
  getGroupsForTutor,
  getRecentExamAttemptCount,
  getRosterForGroup,
  averageScoreFromRoster,
} from "@/services/tutorDashboard";
import { listAssignmentsForGroup } from "@/services/assignments";
import { listTopicsWithQuestionCount } from "@/services/questions";
import { getStudentAccessMap } from "@/services/studentPayments";
import { assignmentDueDateBounds } from "@/lib/assignments";
import { attentionList } from "@/lib/attention";
import { describeStudentAccess } from "@/lib/labels";
import { StatTile } from "@/components/StatTile";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { GroupAnalyticsCards } from "@/components/GroupAnalyticsCards";
import { GroupAssignmentsCard } from "@/components/GroupAssignmentsCard";
import { AttentionCard } from "@/components/AttentionCard";
import { RosterTable } from "../../RosterTable";
import { NewStudentModal } from "../../NewStudentModal";
import { NewAssignmentModal } from "../../NewAssignmentModal";

/**
 * Ustozning guruh sahifasi.
 *
 * Ilgari guruh "sahifa" emas, panel ustidagi FILTR edi (ochiladigan ro'yxat)
 * — ya'ni guruhga havola berib bo'lmasdi va bir nechta guruhi bor ustoz har
 * safar ro'yxatdan tanlab o'tirardi. Endi guruh — o'z manziliga ega obyekt,
 * xuddi o'quvchi sahifasi kabi.
 *
 * Direktorning guruh sahifasi (`/director/guruh/[id]`) bilan bir xil
 * ma'lumotni ko'rsatadi, farqi amallar: vazifa berish va o'quvchi qo'shish
 * shu yerda.
 */
export default async function TutorGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("TUTOR");
  const { id: groupId } = await params;

  const group = await getGroupDetail(groupId);
  // Begona guruh ham, mavjud bo'lmagan ID ham AYNI 404 — aks holda ID
  // sinab ko'rib, boshqa ustozda qanday guruhlar borligini bilib olish
  // mumkin bo'lardi.
  if (!group || !canViewGroup(user, group)) notFound();

  const [analytics, roster, recentExamCount, assignments, topics, groups] = await Promise.all([
    getGroupAnalytics(groupId),
    getRosterForGroup(groupId),
    getRecentExamAttemptCount(groupId),
    listAssignmentsForGroup(groupId),
    listTopicsWithQuestionCount(),
    getGroupsForTutor(user.id),
  ]);

  // To'lov holati — ustoz faqat KO'RADI (nega o'quvchi test ishlay
  // olmayotganini tushunishi uchun), tasdiqlash direktorda.
  const accessMap = await getStudentAccessMap(roster.map((r) => r.studentId));
  const paymentStatus = Object.fromEntries(
    roster.map((r) => [
      r.studentId,
      describeStudentAccess(accessMap.get(r.studentId) ?? { kind: "free" }),
    ])
  );
  const showPayments = [...accessMap.values()].some((a) => a.kind !== "free");

  const attention = attentionList(roster);
  const averageScore = averageScoreFromRoster(roster);
  const totalAttempts = roster.reduce(
    (sum, r) => sum + r.examAttemptCount + r.practiceAttemptCount,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {/* Bitta guruhi bor ustozda ro'yxat sahifasi ochilmaydi
              (`/tutor` to'g'ridan-to'g'ri shu yerga yo'naltiradi), shuning
              uchun orqaga havola ham ortiqcha. */}
          {groups.length > 1 && (
            <Link
              href="/tutor"
              className="text-sm text-text-muted hover:text-text hover:underline"
            >
              ← Guruhlarim
            </Link>
          )}
          <h1 className="mt-1 text-xl font-semibold text-text">{group.name}</h1>
          <p className="mt-1 text-sm text-text-muted">
            {group.studentCount} ta o&apos;quvchi · Qatorni bosing — o&apos;quvchi
            sahifasi ochiladi
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <NewStudentModal groups={groups} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile
          emphasis="primary"
          label="Guruh o'rtacha bali"
          value={averageScore === null ? "—" : `${averageScore}%`}
          sub={
            averageScore === null ? "Imtihon topshirilmagan" : "Yakunlangan imtihonlar bo'yicha"
          }
        />
        <StatTile label="O'quvchilar" value={roster.length} />
        <StatTile
          label="So'nggi hafta imtihonlar"
          value={recentExamCount}
          sub="Yakunlanganlari"
        />
      </div>

      {/* Ko'rsatkichlardan keyin darhol — ustozning asosiy savoli "kimga
          e'tibor berishim kerak?", o'rtacha ball emas. */}
      <AttentionCard items={attention} studentHref={(id) => `/tutor/oquvchi/${id}`} />

      <GroupAssignmentsCard
        assignments={assignments}
        canManage={true}
        action={
          <NewAssignmentModal
            groupId={group.id}
            groupName={group.name}
            topics={topics.filter((t) => t.questionCount > 0)}
            dueBounds={assignmentDueDateBounds()}
          />
        }
      />

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
          o&apos;quvchi boshqa guruhdan ko&apos;chirilgan bo&apos;lsa, uning eski
          natijalari eski ustozida qoladi. O&apos;quvchining guruhini
          o&apos;zgartirish kerak bo&apos;lsa, direktorga murojaat qiling.
        </p>
        <RosterTable roster={roster} paymentStatus={showPayments ? paymentStatus : null} />
      </Card>
    </div>
  );
}
