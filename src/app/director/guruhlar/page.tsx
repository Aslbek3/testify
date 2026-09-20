import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { canViewOrganization } from "@/lib/permissions";
import {
  getGroupsOverview,
  getOrganizationOverview,
  listTutorsForOrganization,
  GROUP_NAME_MAX_LENGTH,
  type GroupOverviewRow,
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
import { NewGroupModal } from "../NewGroupModal";
import { readinessFromScore } from "@/lib/readiness";
import { formatRelativeDays, daysSinceUz } from "@/lib/format";
import { INACTIVE_DAYS } from "@/lib/attention";
import { cn } from "@/lib/cn";

/**
 * Guruhlar jurnali.
 *
 * Panel "hamma narsa qanday?" degan savolga javob beradi, jurnal esa
 * "qaysi biri orqada qolyapti?" degan savolga. Shuning uchun bu yerda
 * taqqoslash asosiy: har bir shkalada avtomaktab o'rtachasi chizig'i
 * turadi va u HAMMA qatorda bir xil joyda bo'ladi.
 *
 * Filtr va qidiruv URL orqali ishlaydi (`JournalToolbar`), ya'ni
 * filtrlangan ro'yxatni havola sifatida yuborish mumkin.
 */

type Filter = "" | "etibor" | "bosh" | "jim";

const FILTER_LABEL: Record<Exclude<Filter, "">, string> = {
  etibor: "Diqqat talab qiladi",
  bosh: "Bo'sh",
  jim: "Jim",
};

/** Guruh shu filtrga tushadimi. Sof funksiya — sanash ham, saralash ham shundan. */
function matchesFilter(row: GroupOverviewRow, filter: Filter, now: Date): boolean {
  switch (filter) {
    case "etibor":
      // Ball o'tish chegarasidan past. "Ball yo'q" bu yerga KIRMAYDI: u
      // alohida holat va guruh endigina ochilgan bo'lishi mumkin.
      return row.averageScore !== null && readinessFromScore(row.averageScore).variant !== "success";
    case "bosh":
      return row.studentCount === 0;
    case "jim":
      return (
        row.lastActivityAt === null || daysSinceUz(row.lastActivityAt, now) >= INACTIVE_DAYS
      );
    default:
      return true;
  }
}

export default async function GroupsJournalPage({
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
    filtr === "etibor" || filtr === "bosh" || filtr === "jim" ? filtr : "";
  const query = (q ?? "").trim();

  const [overview, groups, tutors] = await Promise.all([
    getOrganizationOverview(user.organizationId),
    getGroupsOverview(user.organizationId),
    listTutorsForOrganization(user.organizationId),
  ]);

  // Vaqtni BIR MARTA olamiz: har qator uchun alohida `new Date()` chaqirilsa,
  // uzun ro'yxatda kun chegarasi o'rtada o'zgarib qolishi mumkin.
  const now = new Date();

  const counts = {
    etibor: groups.filter((g) => matchesFilter(g, "etibor", now)).length,
    bosh: groups.filter((g) => matchesFilter(g, "bosh", now)).length,
    jim: groups.filter((g) => matchesFilter(g, "jim", now)).length,
  };

  const needle = query.toLowerCase();
  const rows = groups
    .filter((g) => matchesFilter(g, filter, now))
    .filter(
      (g) =>
        needle === "" ||
        g.groupName.toLowerCase().includes(needle) ||
        g.tutorName.toLowerCase().includes(needle)
    )
    // Eng zaifi tepada: jurnal ochilganda birinchi ko'rinadigan narsa
    // e'tibor talab qiladigan guruh bo'lishi kerak. Balsiz guruhlar oxirida.
    .sort((a, b) => {
      if (a.averageScore === null && b.averageScore === null) {
        return a.groupName.localeCompare(b.groupName);
      }
      if (a.averageScore === null) return 1;
      if (b.averageScore === null) return -1;
      return a.averageScore - b.averageScore;
    });

  const isFiltered = filter !== "" || query !== "";

  return (
    <div className="space-y-5">
      <Breadcrumb
        items={[
          { label: "Direktor paneli", href: "/director" },
          { label: "Guruhlar jurnali" },
        ]}
      />

      <PageHeader
        title="Guruhlar jurnali"
        description="Har bir guruh avtomaktab o'rtachasiga nisbatan ko'rsatilgan. Guruh nomini bosing — to'liq tahlil ochiladi."
        actions={
          <NewGroupModal tutors={tutors} nameMaxLength={GROUP_NAME_MAX_LENGTH} />
        }
      />

      <SummaryStrip
        items={[
          { label: "Guruhlar", value: overview.groupCount },
          {
            label: "O'quvchilar",
            value: overview.studentCount,
            hint:
              overview.groupCount > 0
                ? `o'rtacha ${Math.round(overview.studentCount / overview.groupCount)}`
                : undefined,
          },
          {
            label: "O'rtacha ball",
            value: overview.averageScore === null ? "—" : `${overview.averageScore}%`,
          },
          { label: "Ustozlar", value: overview.tutorCount },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <FilterChips
          basePath="/director/guruhlar"
          active={filter}
          keepParams={{ q: query || undefined }}
          options={[
            { value: "", label: "Hammasi", count: groups.length },
            { value: "etibor", label: FILTER_LABEL.etibor, count: counts.etibor },
            { value: "bosh", label: FILTER_LABEL.bosh, count: counts.bosh },
            { value: "jim", label: FILTER_LABEL.jim, count: counts.jim },
          ]}
        />
        <JournalSearch
          basePath="/director/guruhlar"
          defaultValue={query}
          placeholder="Guruh yoki ustoz nomi"
          keepParams={{ filtr: filter || undefined }}
        />
      </div>

      <Card className="p-0 sm:p-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={isFiltered ? "search" : "building"}
            title={isFiltered ? "Mos guruh topilmadi" : "Hozircha guruh yo'q"}
            description={
              isFiltered
                ? "Filtrni o'zgartiring yoki qidiruvni tozalang."
                : "Birinchi guruhni yarating — keyin unga ustoz va o'quvchilar biriktiriladi."
            }
            action={
              isFiltered
                ? { href: "/director/guruhlar", label: "Filtrni tozalash" }
                : undefined
            }
          />
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Guruh</TableHeaderCell>
                  <TableHeaderCell>Ustoz</TableHeaderCell>
                  <TableHeaderCell align="right">O&apos;quvchilar</TableHeaderCell>
                  <TableHeaderCell className="w-[190px]">
                    O&apos;rtacha ball
                  </TableHeaderCell>
                  <TableHeaderCell>Oxirgi faollik</TableHeaderCell>
                  <TableHeaderCell>Holat</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const readiness = readinessFromScore(row.averageScore);
                  const idleDays =
                    row.lastActivityAt === null
                      ? null
                      : daysSinceUz(row.lastActivityAt, now);
                  const isIdle = idleDays === null || idleDays >= INACTIVE_DAYS;

                  return (
                    // `relative` + havoladagi `after:absolute inset-0` — butun
                    // qator bosiladigan bo'ladi, lekin JavaScriptsiz va
                    // klaviatura bilan ham ishlaydi (fokus havolaga tushadi).
                    <TableRow key={row.groupId} className="relative hover:bg-brand-soft/40">
                      <TableCell>
                        <Link
                          href={`/director/guruh/${row.groupId}`}
                          className="font-semibold text-text after:absolute after:inset-0 hover:text-brand"
                        >
                          {row.groupName}
                        </Link>
                        <span className="mt-0.5 block text-[11.5px] text-text-faint">
                          {row.attemptCount} ta urinish
                        </span>
                      </TableCell>
                      <TableCell>
                        {/* Ustoz havolasi qator havolasi USTIDA turishi kerak,
                            aks holda u bosilmay qolardi. */}
                        <Link
                          href={`/director/ustoz/${row.tutorId}`}
                          className="relative z-10 font-medium text-text-muted underline-offset-2 hover:text-brand hover:underline"
                        >
                          {row.tutorName}
                        </Link>
                      </TableCell>
                      <TableCell align="right">{row.studentCount}</TableCell>
                      <TableCell>
                        <CompareBar
                          value={row.averageScore}
                          average={overview.averageScore}
                        />
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "font-mono text-[13px] tabular-nums",
                            isIdle ? "font-semibold text-warning" : "text-text-muted"
                          )}
                        >
                          {formatRelativeDays(row.lastActivityAt, now)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {row.studentCount === 0 ? (
                          <Badge variant="neutral">Bo&apos;sh</Badge>
                        ) : (
                          <Badge variant={readiness.variant}>{readiness.label}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="border-t border-border px-4 py-3 sm:px-5">
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-text-muted">
                <span className="flex items-center gap-1.5 font-semibold text-text">
                  <Icon name="chart" className="h-4 w-4 text-text-faint" />
                  Jami {rows.length} ta guruh
                </span>
                <span>
                  {rows.reduce((sum, r) => sum + r.studentCount, 0)} o&apos;quvchi
                </span>
              </p>
              <CompareLegend average={overview.averageScore} />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
