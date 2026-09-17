import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { canViewOrganization } from "@/lib/permissions";
import { getTutorProfile, getTutorRanking } from "@/services/directorDashboard";
import { getGroupSummariesForTutor } from "@/services/tutorDashboard";
import { listAssignmentsForGroup } from "@/services/assignments";
import { StatTile } from "@/components/StatTile";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Badge } from "@/components/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/Table";
import { readinessFromScore } from "@/lib/readiness";
import { formatDate } from "@/lib/format";

/**
 * Direktor uchun ustoz sahifasi — xuddi ustozda o'quvchi sahifasi
 * bo'lgani kabi.
 *
 * ⚠️ Ustozni FAQAT o'quvchilarining o'rtacha bali bilan baholash
 * adolatsiz: guruhlar tarkibi har xil (kimdir yangi kelganlar bilan, kimdir
 * imtihonga tayyorlar bilan ishlaydi). Shuning uchun natija ko'rsatkichi
 * yonida FAOLLIK ko'rsatkichlari ham turadi — bergan vazifalari va
 * ularning bajarilishi, guruhlardagi so'nggi harakat.
 */
export default async function DirectorTutorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("DIRECTOR");
  const { id: tutorId } = await params;

  const tutor = await getTutorProfile(tutorId);
  // Boshqa tashkilotning ustozi ham, mavjud bo'lmagan ID ham AYNI 404.
  if (
    !tutor ||
    !tutor.organizationId ||
    !canViewOrganization(user, tutor.organizationId)
  ) {
    notFound();
  }

  const [groups, ranking] = await Promise.all([
    getGroupSummariesForTutor(tutorId),
    // Reyting jadvalidagi bilan bir xil son bo'lishi uchun o'sha manbadan.
    getTutorRanking(tutor.organizationId),
  ]);
  const rankingRow = ranking.find((row) => row.tutorId === tutorId) ?? null;

  // Vazifalar barcha guruhlari bo'yicha — guruhlar soni oz, shuning uchun
  // mavjud funksiya har biri uchun chaqiriladi.
  const assignmentsByGroup = await Promise.all(
    groups.map(async (group) => ({
      group,
      assignments: await listAssignmentsForGroup(group.id),
    }))
  );
  const allAssignments = assignmentsByGroup.flatMap(({ group, assignments }) =>
    assignments.map((assignment) => ({ ...assignment, groupName: group.name }))
  );
  const completedTotal = allAssignments.reduce((sum, a) => sum + a.completedCount, 0);
  const expectedTotal = allAssignments.reduce((sum, a) => sum + a.students.length, 0);

  const studentCount = groups.reduce((sum, g) => sum + g.studentCount, 0);
  const recentExamCount = groups.reduce((sum, g) => sum + g.recentExamCount, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/director"
          className="text-sm text-text-muted hover:text-text hover:underline"
        >
          ← Direktor paneli
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-text">{tutor.name}</h1>
          <Badge variant={tutor.isActive ? "success" : "danger"}>
            {tutor.isActive ? "Faol" : "Bloklangan"}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-text-muted">
          {tutor.email} · Qo&apos;shilgan: {formatDate(tutor.createdAt)} · Bloklash
          va parolni tiklash direktor panelidagi ustozlar jadvalida.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile
          emphasis="primary"
          label="O'rtacha ball"
          value={rankingRow?.averageScore === null || !rankingRow ? "—" : `${rankingRow.averageScore}%`}
          sub={
            rankingRow && rankingRow.averageScore !== null
              ? `${rankingRow.scoredStudentCount} o'quvchi natijasidan`
              : "Imtihon topshirilmagan"
          }
        />
        <StatTile label="O'quvchilar" value={studentCount} />
        <StatTile label="Guruhlar" value={groups.length} />
        <StatTile
          label="Hafta imtihonlari"
          value={recentExamCount}
          sub="Yakunlanganlari"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Guruhlari</CardTitle>
          <span className="text-sm text-text-muted">{groups.length} ta guruh</span>
        </CardHeader>

        {groups.length === 0 ? (
          <p className="text-sm text-text-muted">
            Bu ustozga hali guruh biriktirilmagan. Guruh yaratish yoki mavjudini
            unga berish — direktor panelidagi &quot;Guruhlar&quot; jadvalida.
          </p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Guruh</TableHeaderCell>
                <TableHeaderCell align="right">O&apos;quvchilar</TableHeaderCell>
                <TableHeaderCell align="right">O&apos;rtacha ball</TableHeaderCell>
                <TableHeaderCell align="right">Hafta imtihonlari</TableHeaderCell>
                <TableHeaderCell>So&apos;nggi faollik</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((group) => {
                const readiness = readinessFromScore(group.averageScore);
                return (
                  <TableRow key={group.id} clickable>
                    <TableCell>
                      <Link href={`/director/guruh/${group.id}`} className="block font-medium">
                        {group.name}
                      </Link>
                    </TableCell>
                    <TableCell align="right">{group.studentCount}</TableCell>
                    <TableCell align="right">
                      {group.averageScore === null ? (
                        <span className="text-text-muted">—</span>
                      ) : (
                        <Badge variant={readiness.variant}>
                          <span className="font-mono">{group.averageScore}%</span>
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell align="right">{group.recentExamCount}</TableCell>
                    <TableCell>
                      {group.lastActivityAt ? (
                        <span className="font-mono tabular-nums">
                          {formatDate(group.lastActivityAt)}
                        </span>
                      ) : (
                        <span className="text-text-muted">Faollik yo&apos;q</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bergan vazifalari</CardTitle>
          <span className="text-sm text-text-muted">
            {allAssignments.length > 0
              ? `${allAssignments.length} ta vazifa · ${completedTotal}/${expectedTotal} bajarilgan`
              : "Oxirgi 30 kun"}
          </span>
        </CardHeader>

        {allAssignments.length === 0 ? (
          <p className="text-sm text-text-muted">
            Oxirgi 30 kunda vazifa berilmagan. Vazifa — ustozning o&apos;quvchi
            bilan ishlash vositasi: u o&apos;quvchiga aniq maqsad qo&apos;yadi
            va bajarilishi shu yerda ko&apos;rinadi.
          </p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Vazifa</TableHeaderCell>
                <TableHeaderCell>Guruh</TableHeaderCell>
                <TableHeaderCell>Muddat</TableHeaderCell>
                <TableHeaderCell align="right">Bajardi</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allAssignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>{assignment.title}</TableCell>
                  <TableCell>{assignment.groupName}</TableCell>
                  <TableCell>
                    <span className="font-mono tabular-nums">
                      {formatDate(assignment.dueAt)}
                    </span>
                    {assignment.isOverdue && (
                      <span className="ml-2 text-sm text-text-muted">o&apos;tdi</span>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {assignment.completedCount} / {assignment.students.length}
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
