import Link from "next/link";
import { requireRole } from "@/lib/auth";
import {
  listAssignmentsForTutor,
  getGroupsForTutor,
  type TutorAssignmentRow,
} from "@/services/tutorDashboard";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumb } from "@/components/Breadcrumb";
import { SummaryStrip } from "@/components/SummaryStrip";
import { FilterChips } from "@/components/JournalToolbar";
import { CompareBar } from "@/components/CompareBar";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/Badge";
import { Icon } from "@/components/Icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/Table";
import { describeAssignmentDue } from "@/lib/assignments";
import { formatDate } from "@/lib/format";

/**
 * Ustozning barcha vazifalari bitta ro'yxatda.
 *
 * Vazifa berish — ustozning YAGONA o'ziga xos ishi: direktor ham,
 * qabulxona ham qila olmaydi (`docs/rollar.md`). Shunga qaramay u faqat
 * guruh sahifasi ichida ko'rinardi, ya'ni 3 guruhga vazifa bergan ustoz
 * "qaysisining muddati yaqin, kim bajarmagan?" degan savolga uchta
 * sahifani ochmasdan javob topa olmasdi.
 *
 * Yangi vazifa berish bu yerda ATAYLAB yo'q: vazifa doim aniq guruhga
 * beriladi va guruh sahifasida mavzu tanlash, muddat qo'yish konteksti
 * bor. Bu yerda esa kuzatuv — "nima bo'lyapti?".
 */

type Filter = "" | "faol" | "otgan" | "tugallanmagan";

function matchesFilter(row: TutorAssignmentRow, filter: Filter): boolean {
  switch (filter) {
    case "faol":
      return !row.isOverdue;
    case "otgan":
      return row.isOverdue;
    case "tugallanmagan":
      // Hali hamma bajarmagan — ustoz eslatishi mumkin bo'lgan vazifalar.
      return !row.isOverdue && row.completedCount < row.students.length;
    default:
      return true;
  }
}

export default async function TutorAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filtr?: string }>;
}) {
  const user = await requireRole("TUTOR");
  const { filtr } = await searchParams;

  const filter: Filter =
    filtr === "faol" || filtr === "otgan" || filtr === "tugallanmagan" ? filtr : "";

  const now = new Date();
  const [assignments, groups] = await Promise.all([
    listAssignmentsForTutor(user.id, now),
    getGroupsForTutor(user.id),
  ]);

  if (groups.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Vazifalar"
          description="Barcha guruhlaringizga bergan vazifalaringiz va ularning bajarilishi."
        />
        <Card>
          <EmptyState
            icon="building"
            title="Guruh biriktirilmagan"
            description="Vazifa guruhga beriladi. Sizga hali guruh biriktirilmagan — direktoringizga murojaat qiling."
          />
        </Card>
      </div>
    );
  }

  const counts = {
    faol: assignments.filter((a) => matchesFilter(a, "faol")).length,
    otgan: assignments.filter((a) => matchesFilter(a, "otgan")).length,
    tugallanmagan: assignments.filter((a) => matchesFilter(a, "tugallanmagan")).length,
  };

  const rows = assignments.filter((a) => matchesFilter(a, filter));

  const expectedTotal = assignments.reduce((sum, a) => sum + a.students.length, 0);
  const completedTotal = assignments.reduce((sum, a) => sum + a.completedCount, 0);
  const completionPercent =
    expectedTotal > 0 ? Math.round((completedTotal / expectedTotal) * 100) : null;

  const isFiltered = filter !== "";

  return (
    <div className="space-y-5">
      <Breadcrumb
        items={[{ label: "Guruhlarim", href: "/tutor" }, { label: "Vazifalar" }]}
      />

      <PageHeader
        title="Vazifalar"
        description="Barcha guruhlaringizga bergan vazifalaringiz. Yangi vazifa guruh sahifasidan beriladi — u yerda mavzu va muddat konteksti bor."
      />

      <SummaryStrip
        items={[
          { label: "Faol vazifalar", value: counts.faol },
          {
            label: "Bajarilishi",
            value: completionPercent === null ? "—" : `${completionPercent}%`,
            hint: expectedTotal > 0 ? `${completedTotal}/${expectedTotal}` : undefined,
          },
          { label: "Tugallanmagan", value: counts.tugallanmagan },
          { label: "Muddati o'tgan", value: counts.otgan },
        ]}
      />

      <FilterChips
        basePath="/tutor/vazifalar"
        active={filter}
        options={[
          { value: "", label: "Hammasi", count: assignments.length },
          { value: "faol", label: "Faol", count: counts.faol },
          { value: "tugallanmagan", label: "Tugallanmagan", count: counts.tugallanmagan },
          { value: "otgan", label: "Muddati o'tgan", count: counts.otgan },
        ]}
      />

      <Card className="p-0 sm:p-0">
        {rows.length === 0 ? (
          <EmptyState
            icon="clipboardCheck"
            title={isFiltered ? "Mos vazifa topilmadi" : "Hali vazifa berilmagan"}
            description={
              isFiltered
                ? "Boshqa filtrni tanlang."
                : "Vazifa — o'quvchiga aniq maqsad qo'yish vositasi: «shu hafta 2 ta imtihon». Uni guruh sahifasidan berasiz."
            }
            action={
              isFiltered
                ? { href: "/tutor/vazifalar", label: "Filtrni tozalash" }
                : { href: "/tutor", label: "Guruhlarim" }
            }
          />
        ) : (
          <Table className="min-w-[860px]">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Vazifa</TableHeaderCell>
                <TableHeaderCell>Guruh</TableHeaderCell>
                <TableHeaderCell>Muddat</TableHeaderCell>
                <TableHeaderCell className="w-[190px]">Bajarilishi</TableHeaderCell>
                <TableHeaderCell>Holat</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const due = describeAssignmentDue(row.dueAt, now);
                const percent =
                  row.students.length > 0
                    ? Math.round((row.completedCount / row.students.length) * 100)
                    : null;
                const notDone = row.students.length - row.completedCount;

                return (
                  <TableRow key={row.id} className="relative hover:bg-brand-soft/40">
                    <TableCell>
                      {/* Vazifaning o'z sahifasi yo'q — guruh sahifasida
                          u o'quvchilar kesimida ko'rinadi, ya'ni "kim
                          bajarmadi?" degan savolga javob o'sha yerda. */}
                      <Link
                        href={`/guruh/${row.groupId}`}
                        className="font-semibold text-text after:absolute after:inset-0 hover:text-brand"
                      >
                        {row.title}
                      </Link>
                      {row.note && (
                        <span className="mt-0.5 block truncate text-[11.5px] text-text-faint">
                          {row.note}
                        </span>
                      )}
                    </TableCell>
                    <TableCell data-label="Guruh">
                      <span className="text-text-muted">{row.groupName}</span>
                    </TableCell>
                    <TableCell data-label="Muddat">
                      <span className="font-mono text-[13px] tabular-nums text-text-muted">
                        {formatDate(row.dueAt)}
                      </span>
                    </TableCell>
                    <TableCell data-label="Bajarilishi">
                      <div className="flex items-center gap-2.5">
                        <CompareBar value={percent} average={null} />
                        <span className="shrink-0 font-mono text-[12px] tabular-nums text-text-faint">
                          {row.completedCount}/{row.students.length}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell data-label="Holat">
                      {row.isOverdue ? (
                        <Badge variant="neutral">Muddati o&apos;tgan</Badge>
                      ) : notDone === 0 ? (
                        <Badge variant="success">Hamma bajardi</Badge>
                      ) : (
                        <Badge variant={due.variant}>{due.label}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {rows.length > 0 && (
        <p className="flex items-center gap-2 px-1 text-[12px] text-text-faint">
          <Icon name="clipboardCheck" className="h-4 w-4" />
          Vazifa nomini bosing — guruh sahifasi ochiladi, u yerda kim
          bajargani o&apos;quvchilar kesimida ko&apos;rinadi.
        </p>
      )}
    </div>
  );
}
