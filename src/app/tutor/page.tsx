import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
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
import { getGroupSummariesForTutor } from "@/services/tutorDashboard";
import { readinessFromScore } from "@/lib/readiness";
import { formatDate } from "@/lib/format";

/**
 * Ustoz paneli — guruhlar ro'yxati.
 *
 * Ilgari bu sahifa BITTA guruhning paneli edi, guruh esa yuqoridagi
 * ochiladigan ro'yxatdan tanlanardi. Endi har bir guruh o'z sahifasiga ega
 * (`/tutor/guruh/[id]`), bu yerda esa ularning qisqa ko'rsatkichlari
 * yonma-yon turadi — bir nechta guruhi bor ustoz qaysi biriga e'tibor
 * berish kerakligini bir qarashda ko'radi.
 *
 * Bitta guruhi bor ustoz uchun ro'yxat ortiqcha bosish bo'lardi — u
 * to'g'ridan-to'g'ri guruh sahifasiga o'tadi.
 */
export default async function TutorPage() {
  const user = await requireRole("TUTOR");
  const groups = await getGroupSummariesForTutor(user.id);

  if (groups.length === 1) redirect(`/guruh/${groups[0].id}`);

  if (groups.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-text">Ustoz paneli</h1>
          <p className="mt-1 text-sm text-text-muted">
            Guruhingizdagi o&apos;quvchilarning progressini shu yerdan kuzatasiz.
          </p>
        </div>
        <Card className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border text-xl text-text-muted">
            —
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-text">Guruh biriktirilmagan</p>
            <p className="max-w-sm text-sm leading-relaxed text-text-muted">
              Sizga hali o&apos;quvchilar guruhi biriktirilmagan. Statistikani
              ko&apos;rish uchun direktoringiz sizga guruh biriktirishi kerak.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Guruhlarim</h1>
        <p className="mt-1 text-sm text-text-muted">
          Guruhni bosing — o&apos;quvchilar, vazifalar va mavzular tahlili
          ochiladi.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Guruhlar</CardTitle>
          <span className="text-sm text-text-muted">{groups.length} ta guruh</span>
        </CardHeader>
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
                    <Link href={`/guruh/${group.id}`} className="block font-medium">
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
      </Card>
    </div>
  );
}
