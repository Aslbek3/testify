import { requireRole } from "@/lib/auth";
import { canViewOrganization } from "@/lib/permissions";
import {
  getOrganizationOverview,
  getTutorRanking,
  getGroupsOverview,
  listTutorsForOrganization,
} from "@/services/directorDashboard";
import { NewTutorModal } from "./NewTutorModal";
import { NewGroupModal } from "./NewGroupModal";
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
import { formatDate } from "@/lib/format";

export default async function DirectorPage() {
  const user = await requireRole("DIRECTOR");

  if (!user.organizationId || !canViewOrganization(user, user.organizationId)) {
    return (
      <p className="text-sm text-text-muted">
        Tashkilotga biriktirilmagansiz. Iltimos, administrator bilan
        bog&apos;laning.
      </p>
    );
  }

  const organizationId = user.organizationId;

  const [overview, tutorRanking, groups, tutors] = await Promise.all([
    getOrganizationOverview(organizationId),
    getTutorRanking(organizationId),
    getGroupsOverview(organizationId),
    listTutorsForOrganization(organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Direktor paneli</h1>
          <p className="mt-1 text-sm text-text-muted">
            Tashkilotingizdagi ustozlar va guruhlar bo&apos;yicha umumiy
            ko&apos;rsatkichlar shu yerda.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NewTutorModal />
          <NewGroupModal tutors={tutors} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile
          emphasis="primary"
          label="O'rtacha ball"
          value={overview.averageScore === null ? "—" : `${overview.averageScore}%`}
          sub={overview.averageScore === null ? "Ma'lumot yo'q" : undefined}
        />
        <StatTile label="Jami guruhlar" value={overview.groupCount} />
        <StatTile label="Jami ustozlar" value={overview.tutorCount} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ustozlar reytingi</CardTitle>
          <span className="text-sm text-text-muted">
            {tutorRanking.length} ta ustoz
          </span>
        </CardHeader>

        {tutorRanking.length === 0 ? (
          <p className="text-sm text-text-muted">Hozircha ustozlar yo&apos;q.</p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>#</TableHeaderCell>
                <TableHeaderCell>Ustoz</TableHeaderCell>
                <TableHeaderCell>Guruh</TableHeaderCell>
                <TableHeaderCell align="right">O&apos;quvchilar</TableHeaderCell>
                <TableHeaderCell align="right">O&apos;rtacha ball</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tutorRanking.map((row, index) => (
                <TableRow key={row.tutorId}>
                  <TableCell className="font-mono">{index + 1}</TableCell>
                  <TableCell className="font-medium">{row.tutorName}</TableCell>
                  <TableCell>{row.groupName}</TableCell>
                  <TableCell align="right">{row.studentCount}</TableCell>
                  <TableCell align="right">
                    {row.averageScore === null ? "—" : `${row.averageScore}%`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Guruhlar</CardTitle>
          <span className="text-sm text-text-muted">{groups.length} ta guruh</span>
        </CardHeader>

        {groups.length === 0 ? (
          <p className="text-sm text-text-muted">Hozircha guruhlar yo&apos;q.</p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Guruh</TableHeaderCell>
                <TableHeaderCell>Ustoz</TableHeaderCell>
                <TableHeaderCell align="right">O&apos;quvchilar</TableHeaderCell>
                <TableHeaderCell>So&apos;nggi faollik</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.groupId}>
                  <TableCell className="font-medium">{group.groupName}</TableCell>
                  <TableCell>{group.tutorName}</TableCell>
                  <TableCell align="right">{group.studentCount}</TableCell>
                  <TableCell>
                    {group.lastActivityAt
                      ? formatDate(group.lastActivityAt)
                      : "Faollik yo'q"}
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
