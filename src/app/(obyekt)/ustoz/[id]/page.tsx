import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAnySession } from "@/lib/auth";
import { canViewOrganization, canManageStaff } from "@/lib/permissions";
import { getTutorProfile, getTutorRanking } from "@/services/directorDashboard";
import { getGroupSummariesForTutor } from "@/services/tutorDashboard";
import { listAssignmentsForGroup } from "@/services/assignments";
import { StatTile } from "@/components/StatTile";
import { Card, CardHeader, CardTitle, CardNote } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumb } from "@/components/Breadcrumb";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/Badge";
import { CompareBar, CompareLegend } from "@/components/CompareBar";
import { TutorRowActions } from "@/app/director/ustozlar/TutorRowActions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/Table";
import { formatDate, formatRelativeDays, daysSinceUz } from "@/lib/format";
import { homeCrumbFor } from "@/lib/navigation";

/**
 * Ustoz sahifasi — direktor va qabulxona uchun (ustozning o'zi ham o'z
 * sahifasini ochadi).
 *
 * ⚠️ Ustozni FAQAT o'quvchilarining o'rtacha bali bilan baholash
 * adolatsiz: guruhlar tarkibi har xil (kimdir yangi kelganlar bilan,
 * kimdir imtihonga tayyorlar bilan ishlaydi). Shuning uchun natija
 * ko'rsatkichi yonida FAOLLIK ham turadi — bergan vazifalari va
 * guruhlardagi so'nggi harakat.
 *
 * Guruh nomlari havola: ustozdan uning guruhiga, guruhdan o'quvchisiga
 * o'tish mumkin. Ilgari bu sahifa `/director/guruh/[id]` ga havola
 * qilardi va ustozning o'zi bosganda hech narsa ochilmasdi.
 */
export default async function TutorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAnySession();
  const { id: tutorId } = await params;

  const tutor = await getTutorProfile(tutorId);
  // Boshqa tashkilotning ustozi ham, mavjud bo'lmagan ID ham AYNI 404 —
  // aks holda ID sinab ko'rib, boshqa avtomaktabda kim ishlashini bilib
  // olish mumkin bo'lardi.
  if (!tutor || !tutor.organizationId) notFound();

  // Ustozning o'zi ham o'z sahifasini ko'ra oladi; qolganlar uchun
  // tashkilot tekshiruvi.
  const isSelf = user.id === tutorId;
  if (!isSelf && !canViewOrganization(user, tutor.organizationId)) notFound();

  // Bloklash va parol tiklash — faqat direktorda (`canManageStaff`).
  // O'zini o'zi bloklash mantiqsiz, shuning uchun u ham chiqariladi.
  const canManage =
    !isSelf && canManageStaff(user, { organizationId: tutor.organizationId });

  const [groups, ranking] = await Promise.all([
    getGroupSummariesForTutor(tutorId),
    // Jurnaldagi bilan bir xil son bo'lishi uchun o'sha manbadan.
    getTutorRanking(tutor.organizationId),
  ]);
  const rankingRow = ranking.find((row) => row.tutorId === tutorId) ?? null;

  // Ustozlar o'rtachasi — taqqoslash chizig'i uchun. Jurnaldagi bilan
  // bir xil qoida.
  const scored = ranking.filter((t) => t.averageScore !== null);
  const tutorAverage =
    scored.length > 0
      ? Math.round(
          scored.reduce((sum, t) => sum + (t.averageScore ?? 0), 0) / scored.length
        )
      : null;

  // Vazifalar barcha guruhlari bo'yicha — guruhlar soni oz, shuning uchun
  // mavjud funksiya har biri uchun chaqiriladi.
  const assignmentsByGroup = await Promise.all(
    groups.map(async (group) => ({
      group,
      assignments: await listAssignmentsForGroup(group.id),
    }))
  );
  const allAssignments = assignmentsByGroup.flatMap(({ group, assignments }) =>
    assignments.map((assignment) => ({
      ...assignment,
      groupId: group.id,
      groupName: group.name,
    }))
  );
  const completedTotal = allAssignments.reduce((sum, a) => sum + a.completedCount, 0);
  const expectedTotal = allAssignments.reduce((sum, a) => sum + a.students.length, 0);

  const studentCount = groups.reduce((sum, g) => sum + g.studentCount, 0);
  const recentExamCount = groups.reduce((sum, g) => sum + g.recentExamCount, 0);

  const lastAssignmentAt = rankingRow?.lastAssignmentAt ?? null;
  const silentDays = lastAssignmentAt === null ? null : daysSinceUz(lastAssignmentAt);

  const home = homeCrumbFor(user.role);

  return (
    <div className="space-y-5">
      <Breadcrumb
        items={[
          home,
          ...(user.role === "DIRECTOR"
            ? [{ label: "Ustozlar", href: "/director/ustozlar" }]
            : []),
          { label: tutor.name },
        ]}
      />

      <PageHeader
        title={tutor.name}
        description={`${tutor.email} · Qo'shilgan: ${formatDate(tutor.createdAt)}`}
        actions={
          canManage ? (
            <TutorRowActions
              tutorId={tutorId}
              tutorName={tutor.name}
              isActive={tutor.isActive}
            />
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={tutor.isActive ? "success" : "danger"}>
          {tutor.isActive ? "Faol" : "Bloklangan"}
        </Badge>
        {groups.length === 0 ? (
          <Badge variant="neutral">Guruhsiz</Badge>
        ) : lastAssignmentAt === null ? (
          <Badge variant="danger">Vazifa bermagan</Badge>
        ) : silentDays !== null && silentDays >= 14 ? (
          <Badge variant="warning">{silentDays} kun jim</Badge>
        ) : (
          <Badge variant="success">
            Oxirgi vazifa: {formatRelativeDays(lastAssignmentAt).toLowerCase()}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatTile
          icon="trophy"
          tone="brand"
          label="O'rtacha ball"
          value={
            !rankingRow || rankingRow.averageScore === null
              ? "—"
              : `${rankingRow.averageScore}%`
          }
          sub={
            rankingRow && rankingRow.averageScore !== null
              ? `${rankingRow.scoredStudentCount} o'quvchi natijasidan`
              : "Imtihon topshirilmagan"
          }
        />
        <StatTile icon="users" tone="info" label="O'quvchilar" value={studentCount} />
        <StatTile icon="building" tone="purple" label="Guruhlar" value={groups.length} />
        <StatTile
          icon="clipboardCheck"
          tone="warning"
          label="Hafta imtihonlari"
          value={recentExamCount}
          sub="Yakunlanganlari"
        />
      </div>

      <Card className="p-0 sm:p-0">
        <div className="px-5 pt-5 sm:px-6 sm:pt-6">
          <CardHeader>
            <CardTitle icon="building">Guruhlari</CardTitle>
            <CardNote>Nomini bosing — guruh jurnali ochiladi</CardNote>
          </CardHeader>
        </div>

        {groups.length === 0 ? (
          <EmptyState
            icon="building"
            title="Guruh biriktirilmagan"
            description="Guruh yaratish yoki mavjudini bu ustozga berish — Guruhlar jurnalida."
            action={
              user.role === "DIRECTOR"
                ? { href: "/director/guruhlar", label: "Guruhlar jurnali" }
                : undefined
            }
          />
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Guruh</TableHeaderCell>
                  <TableHeaderCell align="right">O&apos;quvchilar</TableHeaderCell>
                  <TableHeaderCell className="w-[190px]">
                    O&apos;rtacha ball
                  </TableHeaderCell>
                  <TableHeaderCell align="right">Hafta imtihonlari</TableHeaderCell>
                  <TableHeaderCell>So&apos;nggi faollik</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.id} className="relative hover:bg-brand-soft/40">
                    <TableCell>
                      <Link
                        href={`/guruh/${group.id}`}
                        className="font-semibold text-text after:absolute after:inset-0 hover:text-brand"
                      >
                        {group.name}
                      </Link>
                    </TableCell>
                    <TableCell align="right" data-label="O'quvchilar">
                      {group.studentCount}
                    </TableCell>
                    <TableCell data-label="O'rtacha ball">
                      <CompareBar value={group.averageScore} average={tutorAverage} />
                    </TableCell>
                    <TableCell align="right" data-label="Hafta imtihonlari">
                      {group.recentExamCount}
                    </TableCell>
                    <TableCell data-label="So'nggi faollik">
                      <span className="font-mono text-[13px] tabular-nums text-text-muted">
                        {formatRelativeDays(group.lastActivityAt)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t border-border px-4 py-3 sm:px-5">
              <CompareLegend average={tutorAverage} label="Ustozlar o'rtachasi" />
            </div>
          </>
        )}
      </Card>

      <Card className="p-0 sm:p-0">
        <div className="px-5 pt-5 sm:px-6 sm:pt-6">
          <CardHeader>
            <CardTitle icon="clipboardCheck">Bergan vazifalari</CardTitle>
            <CardNote>
              {allAssignments.length > 0
                ? `${allAssignments.length} ta vazifa · ${completedTotal}/${expectedTotal} bajarilgan`
                : "Oxirgi 30 kun"}
            </CardNote>
          </CardHeader>
        </div>

        {allAssignments.length === 0 ? (
          <EmptyState
            icon="clipboardCheck"
            title="Oxirgi 30 kunda vazifa berilmagan"
            description="Vazifa — ustozning o'quvchi bilan ishlash vositasi: u o'quvchiga aniq maqsad qo'yadi va bajarilishi shu yerda ko'rinadi."
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Vazifa</TableHeaderCell>
                <TableHeaderCell>Guruh</TableHeaderCell>
                <TableHeaderCell>Muddat</TableHeaderCell>
                <TableHeaderCell className="w-[170px]">Bajardi</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allAssignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell className="font-medium">{assignment.title}</TableCell>
                  <TableCell data-label="Guruh">
                    <Link
                      href={`/guruh/${assignment.groupId}`}
                      className="font-medium text-text-muted underline-offset-2 hover:text-brand hover:underline"
                    >
                      {assignment.groupName}
                    </Link>
                  </TableCell>
                  <TableCell data-label="Muddat">
                    <span className="font-mono text-[13px] tabular-nums">
                      {formatDate(assignment.dueAt)}
                    </span>
                    {assignment.isOverdue && (
                      <span className="ml-2 text-[12px] text-text-faint">
                        o&apos;tdi
                      </span>
                    )}
                  </TableCell>
                  <TableCell data-label="Bajardi">
                    <CompareBar
                      value={
                        assignment.students.length > 0
                          ? Math.round(
                              (assignment.completedCount / assignment.students.length) * 100
                            )
                          : null
                      }
                      average={null}
                    />
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
