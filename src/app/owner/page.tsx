import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { listOrganizations } from "@/services/organizations";
import { LogoutButton } from "@/components/LogoutButton";
import { StatTile } from "@/components/StatTile";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/Table";
import { Badge } from "@/components/Badge";
import { PLAN_LABEL, ORG_STATUS_LABEL, ORG_STATUS_VARIANT } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { NewOrganizationModal } from "./NewOrganizationModal";
import { NewDirectorModal } from "./NewDirectorModal";

export default async function OwnerPage() {
  await requireRole("OWNER");
  const organizations = await listOrganizations();

  const totalTutors = organizations.reduce((sum, o) => sum + o.tutorCount, 0);
  const totalStudents = organizations.reduce((sum, o) => sum + o.studentCount, 0);
  const activeCount = organizations.filter((o) => o.status === "ACTIVE").length;

  return (
    <main className="min-h-screen bg-bg-subtle p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-text">App Owner paneli</h1>
            <p className="mt-1 text-sm text-text-muted">
              Barcha avtomaktablarni va platforma bo&apos;yicha o&apos;sishni shu
              yerdan boshqarasiz.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/owner/questions">
              <Button type="button" variant="secondary">
                Savollar bazasi
              </Button>
            </Link>
            <NewDirectorModal
              organizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
            />
            <NewOrganizationModal />
            <LogoutButton />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile label="Jami tashkilotlar" value={organizations.length} />
          <StatTile label="Faol tashkilotlar" value={activeCount} />
          <StatTile label="Jami ustozlar" value={totalTutors} />
          <StatTile label="Jami o'quvchilar" value={totalStudents} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tashkilotlar</CardTitle>
            <span className="text-sm text-text-muted">
              {organizations.length} ta tashkilot
            </span>
          </CardHeader>

          {organizations.length === 0 ? (
            <p className="text-sm text-text-muted">
              Hozircha birorta tashkilot qo&apos;shilmagan.
            </p>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Tashkilot</TableHeaderCell>
                  <TableHeaderCell>Shahar</TableHeaderCell>
                  <TableHeaderCell>Reja</TableHeaderCell>
                  <TableHeaderCell>Holat</TableHeaderCell>
                  <TableHeaderCell align="right">Ustozlar</TableHeaderCell>
                  <TableHeaderCell align="right">O&apos;quvchilar</TableHeaderCell>
                  <TableHeaderCell>Ro&apos;yxatdan o&apos;tgan</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell>{org.city}</TableCell>
                    <TableCell>{PLAN_LABEL[org.plan]}</TableCell>
                    <TableCell>
                      <Badge variant={ORG_STATUS_VARIANT[org.status]}>
                        {ORG_STATUS_LABEL[org.status]}
                      </Badge>
                    </TableCell>
                    <TableCell align="right">{org.tutorCount}</TableCell>
                    <TableCell align="right">{org.studentCount}</TableCell>
                    <TableCell>{formatDate(org.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </main>
  );
}
