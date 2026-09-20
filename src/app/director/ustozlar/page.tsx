import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { canViewOrganization } from "@/lib/permissions";
import {
  getTutorRanking,
  getOrganizationOverview,
  type TutorRankingRow,
} from "@/services/directorDashboard";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumb } from "@/components/Breadcrumb";
import { SummaryStrip } from "@/components/SummaryStrip";
import { FilterChips, JournalSearch } from "@/components/JournalToolbar";
import { CompareBar, CompareLegend } from "@/components/CompareBar";
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
import { NewStaffModal } from "../NewStaffModal";
import { TutorRowActions } from "./TutorRowActions";
import { formatRelativeDays, daysSinceUz } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Ustozlar jurnali.
 *
 * Asosiy qoida (`docs/ishlar.md`): ustozni FAQAT o'quvchilarining o'rtacha
 * bali bilan baholamaslik. Shuning uchun ball yonida ikkita ustun turadi —
 * guruhlari va oxirgi vazifasi. Zaif guruh olgan, lekin har hafta
 * ishlaydigan ustoz bilan yaxshi guruh olib hech narsa qilmaydigan ustoz
 * bu yerda bir xil ko'rinmaydi.
 */

/** Shu kundan ko'p vaqt vazifa bermagan ustoz — "jim". */
const SILENT_DAYS = 14;

type Filter = "" | "jim" | "guruhsiz" | "bloklangan";

function matchesFilter(row: TutorRankingRow, filter: Filter, now: Date): boolean {
  switch (filter) {
    case "jim":
      // Guruhi bo'lmagan ustoz "jim" emas — unga vazifa beradigan joy yo'q.
      if (row.groups.length === 0) return false;
      return (
        row.lastAssignmentAt === null ||
        daysSinceUz(row.lastAssignmentAt, now) >= SILENT_DAYS
      );
    case "guruhsiz":
      return row.groups.length === 0;
    case "bloklangan":
      return !row.isActive;
    default:
      return true;
  }
}

/** Faollik yorlig'i — ball emas, ishning o'zi haqida. */
function activityBadge(row: TutorRankingRow, now: Date) {
  if (!row.isActive) return { variant: "neutral" as const, label: "Bloklangan" };
  if (row.groups.length === 0) return { variant: "neutral" as const, label: "Guruhsiz" };
  if (row.lastAssignmentAt === null) {
    return { variant: "danger" as const, label: "Vazifa bermagan" };
  }
  const days = daysSinceUz(row.lastAssignmentAt, now);
  if (days >= SILENT_DAYS) {
    return { variant: "warning" as const, label: `${days} kun jim` };
  }
  return { variant: "success" as const, label: "Faol" };
}

export default async function TutorsJournalPage({
  searchParams,
}: {
  searchParams: Promise<{ filtr?: string; q?: string }>;
}) {
  const user = await requireRole("DIRECTOR");
  if (!user.organizationId || !canViewOrganization(user, user.organizationId)) {
    return <p className="text-sm text-text-muted">Tashkilot biriktirilmagan.</p>;
  }

  const { filtr, q } = await searchParams;
  const filter: Filter =
    filtr === "jim" || filtr === "guruhsiz" || filtr === "bloklangan" ? filtr : "";
  const query = (q ?? "").trim();

  const [overview, tutors] = await Promise.all([
    getOrganizationOverview(user.organizationId),
    getTutorRanking(user.organizationId),
  ]);

  const now = new Date();

  const counts = {
    jim: tutors.filter((t) => matchesFilter(t, "jim", now)).length,
    guruhsiz: tutors.filter((t) => matchesFilter(t, "guruhsiz", now)).length,
    bloklangan: tutors.filter((t) => matchesFilter(t, "bloklangan", now)).length,
  };

  const needle = query.toLowerCase();
  const rows = tutors
    .filter((t) => matchesFilter(t, filter, now))
    .filter(
      (t) =>
        needle === "" ||
        t.tutorName.toLowerCase().includes(needle) ||
        t.groups.some((g) => g.name.toLowerCase().includes(needle))
    );

  // Ustozlar o'rtachasi — taqqoslash chizig'i shu yerda turadi. Tashkilot
  // o'rtachasidan farq qiladi: bu ustozlar bo'yicha o'rtacha, o'quvchilar
  // bo'yicha emas.
  const scored = tutors.filter((t) => t.averageScore !== null);
  const tutorAverage =
    scored.length > 0
      ? Math.round(scored.reduce((sum, t) => sum + (t.averageScore ?? 0), 0) / scored.length)
      : null;

  const activeWithAssignment = tutors.filter(
    (t) =>
      t.groups.length > 0 &&
      t.lastAssignmentAt !== null &&
      daysSinceUz(t.lastAssignmentAt, now) < SILENT_DAYS
  ).length;

  const isFiltered = filter !== "" || query !== "";

  return (
    <div className="space-y-5">
      <Breadcrumb
        items={[
          { label: "Direktor paneli", href: "/director" },
          { label: "Ustozlar jurnali" },
        ]}
      />

      <PageHeader
        title="Ustozlar jurnali"
        description="Ball yonida faollik ham turadi — ustozni faqat o'quvchilarining bali bilan baholab bo'lmaydi."
        actions={<NewStaffModal role="TUTOR" />}
      />

      <SummaryStrip
        items={[
          { label: "Ustozlar", value: overview.tutorCount },
          {
            label: "O'rtacha ball",
            value: tutorAverage === null ? "—" : `${tutorAverage}%`,
            hint: scored.length > 0 ? `${scored.length} ta ustozdan` : undefined,
          },
          {
            label: "Faol",
            value: activeWithAssignment,
            hint: `${tutors.length} tadan`,
          },
          { label: "Guruhsiz", value: counts.guruhsiz },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <FilterChips
          basePath="/director/ustozlar"
          active={filter}
          keepParams={{ q: query || undefined }}
          options={[
            { value: "", label: "Hammasi", count: tutors.length },
            { value: "jim", label: "Jim", count: counts.jim },
            { value: "guruhsiz", label: "Guruhsiz", count: counts.guruhsiz },
            { value: "bloklangan", label: "Bloklangan", count: counts.bloklangan },
          ]}
        />
        <JournalSearch
          basePath="/director/ustozlar"
          defaultValue={query}
          placeholder="Ustoz yoki guruh nomi"
          keepParams={{ filtr: filter || undefined }}
        />
      </div>

      <Card className="p-0 sm:p-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={isFiltered ? "search" : "graduationCap"}
            title={isFiltered ? "Mos ustoz topilmadi" : "Hozircha ustoz yo'q"}
            description={
              isFiltered
                ? "Filtrni o'zgartiring yoki qidiruvni tozalang."
                : "Ustoz qo'shing — keyin unga guruh biriktiriladi."
            }
            action={
              isFiltered
                ? { href: "/director/ustozlar", label: "Filtrni tozalash" }
                : undefined
            }
          />
        ) : (
          <>
            <Table className="min-w-[1000px]">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Ustoz</TableHeaderCell>
                  <TableHeaderCell>Guruhlari</TableHeaderCell>
                  <TableHeaderCell align="right">O&apos;quvchilar</TableHeaderCell>
                  <TableHeaderCell className="w-[190px]">
                    O&apos;rtacha ball
                  </TableHeaderCell>
                  <TableHeaderCell>Oxirgi vazifa</TableHeaderCell>
                  <TableHeaderCell>Faollik</TableHeaderCell>
                  <TableHeaderCell align="right">Amallar</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const activity = activityBadge(row, now);
                  const silentDays =
                    row.lastAssignmentAt === null
                      ? null
                      : daysSinceUz(row.lastAssignmentAt, now);
                  const isSilent = silentDays === null || silentDays >= SILENT_DAYS;

                  return (
                    <TableRow key={row.tutorId} className="relative hover:bg-brand-soft/40">
                      <TableCell>
                        <Link
                          href={`/director/ustoz/${row.tutorId}`}
                          className="font-semibold text-text after:absolute after:inset-0 hover:text-brand"
                        >
                          {row.tutorName}
                        </Link>
                        {row.scoredStudentCount > 0 &&
                          row.scoredStudentCount !== row.studentCount && (
                            <span className="mt-0.5 block text-[11.5px] text-text-faint">
                              ball {row.scoredStudentCount} o&apos;quvchidan
                            </span>
                          )}
                      </TableCell>
                      <TableCell>
                        {row.groups.length === 0 ? (
                          <span className="text-text-faint">—</span>
                        ) : (
                          // Har bir guruh alohida havola: jurnaldan guruhga
                          // to'g'ridan-to'g'ri o'tish uchun.
                          <span className="relative z-10 flex flex-wrap gap-x-2 gap-y-1">
                            {row.groups.map((group, index) => (
                              <span key={group.id} className="whitespace-nowrap">
                                <Link
                                  href={`/director/guruh/${group.id}`}
                                  className="font-medium text-text-muted underline-offset-2 hover:text-brand hover:underline"
                                >
                                  {group.name}
                                </Link>
                                <span className="text-[11.5px] text-text-faint">
                                  {" "}
                                  ({group.studentCount})
                                </span>
                                {index < row.groups.length - 1 && (
                                  <span className="text-text-faint"> ·</span>
                                )}
                              </span>
                            ))}
                          </span>
                        )}
                      </TableCell>
                      <TableCell align="right">{row.studentCount}</TableCell>
                      <TableCell>
                        <CompareBar value={row.averageScore} average={tutorAverage} />
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "font-mono text-[13px] tabular-nums",
                            row.groups.length === 0
                              ? "text-text-faint"
                              : isSilent
                                ? "font-semibold text-warning"
                                : "text-text-muted"
                          )}
                        >
                          {formatRelativeDays(row.lastAssignmentAt, now)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={activity.variant}>{activity.label}</Badge>
                      </TableCell>
                      <TableCell align="right" className="no-print">
                        <TutorRowActions
                          tutorId={row.tutorId}
                          tutorName={row.tutorName}
                          isActive={row.isActive}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="border-t border-border px-4 py-3 sm:px-5">
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-text-muted">
                <span className="flex items-center gap-1.5 font-semibold text-text">
                  <Icon name="graduationCap" className="h-4 w-4 text-text-faint" />
                  Jami {rows.length} ta ustoz
                </span>
                <span>{rows.reduce((sum, r) => sum + r.studentCount, 0)} o&apos;quvchi</span>
              </p>
              <CompareLegend average={tutorAverage} label="Ustozlar o'rtachasi" />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
