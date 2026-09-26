import Link from "next/link";
import { requireRole } from "@/lib/auth";
import {
  listStudentsForTutor,
  getGroupsForTutor,
  type TutorStudentRow,
} from "@/services/tutorDashboard";
import { getStudentAccessMap } from "@/services/studentPayments";
import { describeStudentAccess } from "@/lib/labels";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumb } from "@/components/Breadcrumb";
import { SummaryStrip } from "@/components/SummaryStrip";
import { FilterChips, JournalSearch } from "@/components/JournalToolbar";
import { CompareBar, CompareLegend } from "@/components/CompareBar";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/Badge";
import { StudentAccessBadge } from "@/components/StudentAccessBadge";
import { Icon } from "@/components/Icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/Table";
import { readinessFromScore } from "@/lib/readiness";
import { formatRelativeDays, daysSinceUz } from "@/lib/format";
import { INACTIVE_DAYS } from "@/lib/attention";
import { cn } from "@/lib/cn";

/**
 * Ustozning o'quvchilari — BARCHA guruhlari bo'yicha bitta ro'yxatda.
 *
 * Ilgari ustoz har guruhni alohida ochishi kerak edi: "Aziz qaysi guruhda
 * edi?" degan savolga qidiruv yo'q, "45 o'quvchim ichida kim eng orqada?"
 * degan savolga guruhlararo taqqoslash yo'q edi.
 *
 * Direktorning jurnalidan farqi: bu yerda to'lov USTUNI bor, lekin
 * to'lovni qabul qilish tugmasi YO'Q — ustoz nega o'quvchi test ishlay
 * olmayotganini bilishi kerak, lekin pul bilan ishlamaydi
 * (`docs/rollar.md`). Guruhni o'zgartirish ham yo'q — u ma'muriy ish.
 */

type Filter = "" | "etibor" | "jim" | "imtihonsiz";

function matchesFilter(row: TutorStudentRow, filter: Filter, now: Date): boolean {
  switch (filter) {
    case "etibor":
      return (
        row.averageScore !== null &&
        readinessFromScore(row.averageScore).variant !== "success"
      );
    case "jim":
      return (
        row.lastActivityAt === null ||
        daysSinceUz(row.lastActivityAt, now) >= INACTIVE_DAYS
      );
    case "imtihonsiz":
      return row.examAttemptCount === 0;
    default:
      return true;
  }
}

export default async function TutorStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filtr?: string; q?: string; guruh?: string }>;
}) {
  const user = await requireRole("TUTOR");
  const { filtr, q, guruh } = await searchParams;

  const filter: Filter =
    filtr === "etibor" || filtr === "jim" || filtr === "imtihonsiz" ? filtr : "";
  const query = (q ?? "").trim();

  const [students, groups] = await Promise.all([
    listStudentsForTutor(user.id),
    getGroupsForTutor(user.id),
  ]);

  if (groups.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="O'quvchilarim"
          description="Barcha guruhlaringizdagi o'quvchilar bitta ro'yxatda."
        />
        <Card>
          <EmptyState
            icon="building"
            title="Guruh biriktirilmagan"
            description="Sizga hali guruh biriktirilmagan — shuning uchun o'quvchilar ro'yxati ham bo'sh. Direktoringizga murojaat qiling."
          />
        </Card>
      </div>
    );
  }

  // To'lov holati — faqat KO'RISH uchun: nega o'quvchi test ishlay
  // olmayotganini tushunish kerak. Tasdiqlash direktor va qabulxonada.
  const accessMap = await getStudentAccessMap(students.map((s) => s.studentId));

  const now = new Date();
  const counts = {
    etibor: students.filter((s) => matchesFilter(s, "etibor", now)).length,
    jim: students.filter((s) => matchesFilter(s, "jim", now)).length,
    imtihonsiz: students.filter((s) => matchesFilter(s, "imtihonsiz", now)).length,
  };

  const needle = query.toLowerCase();
  const rows = students
    .filter((s) => matchesFilter(s, filter, now))
    .filter((s) => guruh === undefined || guruh === "" || s.groupId === guruh)
    .filter(
      (s) =>
        needle === "" ||
        s.name.toLowerCase().includes(needle) ||
        s.groupName.toLowerCase().includes(needle)
    )
    // Eng zaifi tepada — jurnal ochilganda birinchi ko'rinadigan narsa
    // e'tibor talab qiladigan o'quvchi bo'lishi kerak.
    .sort((a, b) => {
      if (a.averageScore === null && b.averageScore === null) {
        return a.name.localeCompare(b.name);
      }
      if (a.averageScore === null) return 1;
      if (b.averageScore === null) return -1;
      return a.averageScore - b.averageScore;
    });

  // Taqqoslash chizig'i — USTOZNING o'z o'quvchilari o'rtachasi.
  // Avtomaktab o'rtachasi bu yerda kerak emas: ustoz o'z ishini
  // baholaydi, boshqa guruhlar bilan raqobatlashmaydi.
  const scored = students.filter((s) => s.averageScore !== null);
  const ownAverage =
    scored.length > 0
      ? Math.round(
          scored.reduce((sum, s) => sum + (s.averageScore ?? 0), 0) / scored.length
        )
      : null;

  const isFiltered = filter !== "" || query !== "" || Boolean(guruh);
  const keepParams = { q: query || undefined, guruh: guruh || undefined };

  return (
    <div className="space-y-5">
      <Breadcrumb
        items={[
          { label: "Guruhlarim", href: "/tutor" },
          { label: "O'quvchilarim" },
        ]}
      />

      <PageHeader
        title="O'quvchilarim"
        description="Barcha guruhlaringizdagi o'quvchilar bitta ro'yxatda. Ismni bosing — to'liq progressi ochiladi."
      />

      <SummaryStrip
        items={[
          { label: "O'quvchilar", value: students.length },
          {
            label: "O'rtacha ball",
            value: ownAverage === null ? "—" : `${ownAverage}%`,
            hint: scored.length > 0 ? `${scored.length} tadan` : undefined,
          },
          { label: "Jim", value: counts.jim, hint: `${INACTIVE_DAYS}+ kun` },
          { label: "Imtihonsiz", value: counts.imtihonsiz },
        ]}
      />

      <div className="space-y-3">
        <FilterChips
          basePath="/tutor/oquvchilar"
          active={filter}
          keepParams={keepParams}
          options={[
            { value: "", label: "Hammasi", count: students.length },
            { value: "etibor", label: "Diqqat talab qiladi", count: counts.etibor },
            { value: "jim", label: "Jim", count: counts.jim },
            { value: "imtihonsiz", label: "Imtihon topshirmagan", count: counts.imtihonsiz },
          ]}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Guruh filtri — bitta guruhi bor ustozda ortiqcha. */}
          {groups.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/tutor/oquvchilar${filter ? `?filtr=${filter}` : ""}`}
                className={cn(
                  "rounded-full border px-3.5 py-2 text-[12px] font-semibold transition-colors pointer-fine:py-1.5",
                  !guruh
                    ? "border-brand bg-brand text-white"
                    : "border-border bg-bg text-text-muted hover:bg-surface-2 hover:text-text"
                )}
              >
                Barcha guruhlar
              </Link>
              {groups.map((group) => {
                const params = new URLSearchParams();
                if (filter) params.set("filtr", filter);
                if (query) params.set("q", query);
                params.set("guruh", group.id);
                return (
                  <Link
                    key={group.id}
                    href={`/tutor/oquvchilar?${params.toString()}`}
                    className={cn(
                      "rounded-full border px-3.5 py-2 text-[12px] font-semibold transition-colors pointer-fine:py-1.5",
                      guruh === group.id
                        ? "border-brand bg-brand text-white"
                        : "border-border bg-bg text-text-muted hover:bg-surface-2 hover:text-text"
                    )}
                  >
                    {group.name}
                  </Link>
                );
              })}
            </div>
          )}
          <JournalSearch
            basePath="/tutor/oquvchilar"
            defaultValue={query}
            placeholder="O'quvchi yoki guruh nomi"
            keepParams={{ filtr: filter || undefined, guruh: guruh || undefined }}
          />
        </div>
      </div>

      <Card className="p-0 sm:p-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={isFiltered ? "search" : "users"}
            title={isFiltered ? "Mos o'quvchi topilmadi" : "Guruhlaringizda o'quvchi yo'q"}
            description={
              isFiltered
                ? "Filtrni o'zgartiring yoki qidiruvni tozalang."
                : "O'quvchi qo'shish direktor va qabulxonada (yoki kalit yoqilgan bo'lsa — guruh sahifasida)."
            }
            action={
              isFiltered
                ? { href: "/tutor/oquvchilar", label: "Filtrni tozalash" }
                : undefined
            }
          />
        ) : (
          <>
            <Table className="min-w-[880px]">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>O&apos;quvchi</TableHeaderCell>
                  <TableHeaderCell>Guruh</TableHeaderCell>
                  <TableHeaderCell align="right">Imtihon</TableHeaderCell>
                  <TableHeaderCell align="right">Mashq</TableHeaderCell>
                  <TableHeaderCell className="w-[180px]">
                    O&apos;rtacha ball
                  </TableHeaderCell>
                  <TableHeaderCell>Oxirgi faollik</TableHeaderCell>
                  <TableHeaderCell>To&apos;lov</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const idleDays =
                    row.lastActivityAt === null
                      ? null
                      : daysSinceUz(row.lastActivityAt, now);
                  const isIdle = idleDays === null || idleDays >= INACTIVE_DAYS;
                  const access = accessMap.get(row.studentId) ?? { kind: "free" as const };

                  return (
                    <TableRow
                      key={row.studentId}
                      className="relative hover:bg-brand-soft/40"
                    >
                      <TableCell>
                        <Link
                          href={`/oquvchi/${row.studentId}`}
                          className="font-semibold text-text after:absolute after:inset-0 hover:text-brand"
                        >
                          {row.name}
                        </Link>
                        {!row.isActive && (
                          <span className="mt-0.5 block text-[11.5px] text-danger">
                            Hisob bloklangan
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/guruh/${row.groupId}`}
                          className="relative z-10 font-medium text-text-muted underline-offset-2 hover:text-brand hover:underline"
                        >
                          {row.groupName}
                        </Link>
                      </TableCell>
                      <TableCell align="right">{row.examAttemptCount}</TableCell>
                      <TableCell align="right">{row.practiceAttemptCount}</TableCell>
                      <TableCell>
                        <CompareBar value={row.averageScore} average={ownAverage} />
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
                        {access.kind === "free" ? (
                          <Badge variant="neutral">—</Badge>
                        ) : (
                          <StudentAccessBadge status={describeStudentAccess(access)} />
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
                  <Icon name="users" className="h-4 w-4 text-text-faint" />
                  {isFiltered
                    ? `${rows.length} ta ko'rsatilmoqda`
                    : `Jami ${rows.length} ta o'quvchi`}
                </span>
                {isFiltered && <span>{students.length} tadan</span>}
              </p>
              <CompareLegend average={ownAverage} label="Sizning o'rtachangiz" />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
