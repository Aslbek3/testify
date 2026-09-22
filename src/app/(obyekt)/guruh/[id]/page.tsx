import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAnySession } from "@/lib/auth";
import {
  canViewGroup,
  canManageGroup,
  canCreateStudent,
  canManageAssignment,
  canManageStudent,
  canResetStudentPassword,
  canManageLesson,
} from "@/lib/permissions";
import {
  getGroupDetail,
  listTutorsForOrganization,
  listGroupsForOrganization,
  GROUP_NAME_MAX_LENGTH,
} from "@/services/directorDashboard";
import {
  getGroupAnalytics,
  getRosterForGroup,
  getRecentExamAttemptCount,
  getGroupsForTutor,
  averageScoreFromRoster,
} from "@/services/tutorDashboard";
import { listAssignmentsForGroup } from "@/services/assignments";
import { listTopicsWithQuestionCount } from "@/services/questions";
import { listLessonsForGroup } from "@/services/lessons";
import { getStudentAccessMap } from "@/services/studentPayments";
import { assignmentDueDateBounds } from "@/lib/assignments";
import { attentionList } from "@/lib/attention";
import { describeStudentAccess } from "@/lib/labels";
import { StatTile } from "@/components/StatTile";
import { Card, CardHeader, CardTitle, CardNote } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumb } from "@/components/Breadcrumb";
import { GroupAnalyticsCards } from "@/components/GroupAnalyticsCards";
import { GroupAssignmentsCard } from "@/components/GroupAssignmentsCard";
import { AttentionCard } from "@/components/AttentionCard";
import { RosterTable } from "@/components/RosterTable";
import { NewStudentModal } from "@/components/NewStudentModal";
import { EditGroupButton } from "@/app/director/EditGroupButton";
import { NewAssignmentModal } from "@/app/tutor/NewAssignmentModal";
import { LessonScheduleCard } from "@/components/LessonScheduleCard";
import { LessonScheduleModal } from "@/components/LessonScheduleModal";
import { homeCrumbFor } from "@/lib/navigation";

/**
 * Guruh sahifasi — direktor, qabulxona va ustoz uchun BITTA sahifa.
 *
 * Ilgari ikki nusxa bor edi (`/director/guruh/[id]` va
 * `/tutor/guruh/[id]`), qabulxonada esa umuman yo'q edi. Ikkalasi bir xil
 * servislardan oziqlanardi va bir xil komponentlarni chizardi — farq
 * faqat amallarda edi. Endi mazmun bitta, amallar `lib/permissions.ts`
 * javoblariga qarab qo'shiladi.
 *
 * Eski manzillar `redirect()` bilan shu yerga yo'naltiriladi.
 */
export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAnySession();
  const { id: groupId } = await params;

  const group = await getGroupDetail(groupId);
  // Boshqa tashkilotning guruhi ham, umuman mavjud bo'lmagan ID ham AYNI
  // natijani beradi (404) — aks holda ID'larni sinab ko'rib, boshqa
  // avtomaktabda qaysi guruhlar borligini aniqlash mumkin bo'lardi.
  if (!group || !canViewGroup(user, group)) notFound();

  const canEdit = canManageGroup(user, group);
  const canAddStudent = canCreateStudent(user, group);
  const canAssign = canManageAssignment(user, group);
  const canBlockStudents = canManageStudent(user, group);
  const canResetPasswords = canResetStudentPassword(user, group);
  const canEditLessons = canManageLesson(user, group);

  const [roster, analytics, recentExamCount, assignments, lessons] =
    await Promise.all([
      getRosterForGroup(groupId),
      getGroupAnalytics(groupId),
      getRecentExamAttemptCount(groupId),
      listAssignmentsForGroup(groupId),
      // Faqat yaqin 12 tasi — jadval butun semestrga tuzilgan
      // bo'lishi mumkin, sahifa esa undan uzun bo'lmasligi kerak.
      listLessonsForGroup(groupId, { limit: 12 }),
    ]);

  // Qo'shimcha ma'lumot FAQAT kerak bo'lganda so'raladi — ruxsati yo'q
  // foydalanuvchi uchun bekorga so'rov yuborilmaydi.
  const [tutors, modalGroups, topics] = await Promise.all([
    canEdit ? listTutorsForOrganization(group.organizationId) : [],
    canAddStudent
      ? user.role === "TUTOR"
        ? getGroupsForTutor(user.id)
        : listGroupsForOrganization(group.organizationId)
      : [],
    canAssign || canEditLessons ? listTopicsWithQuestionCount() : [],
  ]);

  // To'lov holati — ko'rish uchun: nega o'quvchi test ishlay olmayotganini
  // tushunish kerak. Tasdiqlash direktor va qabulxonada, boshqa sahifada.
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

  const home = homeCrumbFor(user.role);

  return (
    <div className="space-y-5">
      <Breadcrumb
        items={[
          home,
          ...(user.role === "DIRECTOR"
            ? [{ label: "Guruhlar", href: "/director/guruhlar" }]
            : []),
          { label: group.name },
        ]}
      />

      <PageHeader
        title={group.name}
        description={`${group.studentCount} ta o'quvchi · Qatorni bosing — o'quvchi sahifasi ochiladi.`}
        actions={
          <>
            {canAddStudent && modalGroups.length > 0 && (
              <NewStudentModal groups={modalGroups} variant="secondary" />
            )}
            {canEdit && (
              <EditGroupButton
                group={{
                  groupId: group.id,
                  groupName: group.name,
                  tutorId: group.tutorId,
                }}
                tutors={tutors}
                nameMaxLength={GROUP_NAME_MAX_LENGTH}
              />
            )}
          </>
        }
      />

      {/* Ustoz ismi sarlavha ostida havola sifatida — guruhdan ustozga,
          ustozdan uning boshqa guruhlariga o'tish mumkin bo'lsin. */}
      <p className="-mt-2 text-[13px] text-text-muted">
        Ustoz:{" "}
        <Link
          href={`/ustoz/${group.tutorId}`}
          className="font-semibold text-brand underline-offset-2 hover:underline"
        >
          {group.tutorName}
        </Link>
      </p>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatTile
          icon="trophy"
          tone="brand"
          label="Guruh o'rtacha bali"
          value={averageScore === null ? "—" : `${averageScore}%`}
          sub={
            averageScore === null
              ? "Imtihon topshirilmagan"
              : "Yakunlangan imtihonlar bo'yicha"
          }
        />
        <StatTile icon="users" tone="info" label="O'quvchilar" value={roster.length} />
        <StatTile
          icon="clipboardCheck"
          tone="purple"
          label="So'nggi hafta imtihonlar"
          value={recentExamCount}
          sub="Yakunlanganlari"
        />
        <StatTile
          icon="chart"
          tone="warning"
          label="Jami urinishlar"
          value={totalAttempts}
          sub="Shu guruhdagilar"
        />
      </div>

      {/* Ko'rsatkichlardan keyin darhol — asosiy savol "kimga e'tibor
          berishim kerak?", o'rtacha ball emas. */}
      <AttentionCard items={attention} studentHref={(id) => `/oquvchi/${id}`} />

      <LessonScheduleCard
        lessons={lessons}
        canManage={canEditLessons}
        action={
          canEditLessons ? (
            <LessonScheduleModal
              groupId={group.id}
              groupName={group.name}
              topics={topics}
              hasUpcoming={lessons.length > 0}
            />
          ) : undefined
        }
        emptyHint={
          canEditLessons
              ? "Jadval tuzsangiz, o'quvchilar keyingi darsni o'z panelida ko'radi va unga tayyorlanib keladi."
              : "Jadvalni guruh ustozi yoki direktor tuzadi."
        }
      />

      <GroupAssignmentsCard
        assignments={assignments}
        canManage={canAssign}
        hint={
          canAssign
            ? undefined
            : `Vazifalarni guruh ustozi (${group.tutorName}) beradi — bu yerda faqat ko'rinadi.`
        }
        action={
          canAssign ? (
            <NewAssignmentModal
              groupId={group.id}
              groupName={group.name}
              topics={topics.filter((t) => t.questionCount > 0)}
              dueBounds={assignmentDueDateBounds()}
            />
          ) : undefined
        }
      />

      <GroupAnalyticsCards analytics={analytics} />

      <Card className="p-0 sm:p-0">
        <div className="px-5 pt-5 sm:px-6 sm:pt-6">
          <CardHeader>
            <CardTitle icon="users">O&apos;quvchilar</CardTitle>
            <CardNote>{totalAttempts} ta yakunlangan urinish</CardNote>
          </CardHeader>
          <p className="mb-4 text-[12.5px] leading-relaxed text-text-muted">
            Jadvaldagi sonlar faqat SHU guruhdagi urinishlarni ko&apos;rsatadi:
            o&apos;quvchi boshqa guruhdan ko&apos;chirilgan bo&apos;lsa, uning
            eski natijalari eski guruhida qoladi.
          </p>
        </div>
        <RosterTable
          roster={roster}
          paymentStatus={showPayments ? paymentStatus : null}
          groupAverage={averageScore}
          canManage={canBlockStudents}
          canResetPassword={canResetPasswords}
          emptyHint={
            canAddStudent
              ? "Yuqoridagi \"O'quvchi qo'shish\" tugmasi orqali birinchi o'quvchini qo'shing."
              : "O'quvchi qo'shish va boshqa guruhdan ko'chirish direktor va qabulxonada."
          }
        />
      </Card>
    </div>
  );
}
