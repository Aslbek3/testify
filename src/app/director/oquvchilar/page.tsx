import { requireRole } from "@/lib/auth";
import { canViewOrganization } from "@/lib/permissions";
import {
  listStudentsForOrganization,
  countStudentsForOrganization,
  listGroupsForOrganization,
  getOrganizationOverview,
  type OrganizationStudentRow,
} from "@/services/directorDashboard";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumb } from "@/components/Breadcrumb";
import { SummaryStrip } from "@/components/SummaryStrip";
import { FilterChips } from "@/components/JournalToolbar";
import { CompareLegend } from "@/components/CompareBar";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { StudentFilters } from "@/components/StudentFilters";
import { StudentsTable } from "@/components/StudentsTable";
import { describeStudentAccess } from "@/lib/labels";
import {
  getStudentAccessMap,
  getStudentPaymentSettings,
} from "@/services/studentPayments";
import { NewStudentModal } from "@/components/NewStudentModal";
import { readinessFromScore } from "@/lib/readiness";
import { daysSinceUz } from "@/lib/format";
import { INACTIVE_DAYS } from "@/lib/attention";
import type { StudentAccess } from "@/lib/studentAccess";

/**
 * O'quvchilar jurnali.
 *
 * Guruhlar va ustozlar jurnali bilan bir xil tuzilish: xulosa qatori →
 * holat filtri → qidiruv → taqqoslash jadvali. Farqi — bu yerda to'lov
 * ustuni bor: o'quvchi to'lamasa testga kira olmaydi, ya'ni direktor va
 * qabulxona uchun bu eng muhim ustun.
 *
 * Jadval (`StudentsTable`) qabulxona bilan UMUMIY — u yerda ham xuddi shu
 * amallar kerak. Nima ko'rinishini rol emas, proplar hal qiladi.
 */

type Filter = "" | "etibor" | "jim" | "tolov" | "bloklangan";

function matchesFilter(
  row: OrganizationStudentRow,
  access: StudentAccess | undefined,
  filter: Filter,
  now: Date
): boolean {
  switch (filter) {
    case "etibor":
      // Ball o'tish chegarasidan past. "Imtihon topshirmagan" bu yerga
      // KIRMAYDI — u alohida holat va "jim" filtri uni topadi.
      return (
        row.averageScore !== null &&
        readinessFromScore(row.averageScore).variant !== "success"
      );
    case "jim":
      return (
        row.lastActivityAt === null ||
        daysSinceUz(row.lastActivityAt, now) >= INACTIVE_DAYS
      );
    case "tolov":
      return access?.kind === "blocked";
    case "bloklangan":
      return !row.isActive;
    default:
      return true;
  }
}

export default async function DirectorStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; group?: string; filtr?: string }>;
}) {
  const user = await requireRole("DIRECTOR");
  const { q, group, filtr } = await searchParams;

  if (!user.organizationId || !canViewOrganization(user, user.organizationId)) {
    return (
      <p className="text-sm text-text-muted">
        Tashkilotga biriktirilmagansiz. Iltimos, administrator bilan
        bog&apos;laning.
      </p>
    );
  }

  const organizationId = user.organizationId;
  const filter: Filter =
    filtr === "etibor" || filtr === "jim" || filtr === "tolov" || filtr === "bloklangan"
      ? filtr
      : "";

  // "Umuman o'quvchi bormi?" (bo'sh holat) va "filtrga hech narsa tushmadi"
  // ikki xil holat. Birinchisi uchun ilgari butun ro'yxat ikkinchi marta
  // yuklanardi va undan faqat `.length` olinardi — endi oddiy `count`.
  const [totalStudentCount, students, groups, paymentSettings, overview] =
    await Promise.all([
      countStudentsForOrganization(organizationId),
      listStudentsForOrganization(organizationId, { q, groupId: group }),
      listGroupsForOrganization(organizationId),
      getStudentPaymentSettings(organizationId),
      getOrganizationOverview(organizationId),
    ]);

  // To'lov holati ro'yxatdagi o'quvchilar uchun — bitta so'rovda.
  const accessMap = await getStudentAccessMap(students.map((s) => s.studentId));

  const now = new Date();
  const counts = {
    etibor: students.filter((s) =>
      matchesFilter(s, accessMap.get(s.studentId), "etibor", now)
    ).length,
    jim: students.filter((s) => matchesFilter(s, accessMap.get(s.studentId), "jim", now))
      .length,
    tolov: students.filter((s) =>
      matchesFilter(s, accessMap.get(s.studentId), "tolov", now)
    ).length,
    bloklangan: students.filter((s) =>
      matchesFilter(s, accessMap.get(s.studentId), "bloklangan", now)
    ).length,
  };

  const rows = students.filter((s) =>
    matchesFilter(s, accessMap.get(s.studentId), filter, now)
  );

  const paymentColumn = rows.map((s) => ({
    studentId: s.studentId,
    ...describeStudentAccess(accessMap.get(s.studentId) ?? { kind: "free" }),
  }));

  const isFiltered = filter !== "" || Boolean(q) || Boolean(group);

  return (
    <div className="space-y-5">
      <Breadcrumb
        items={[
          { label: "Direktor paneli", href: "/director" },
          { label: "O'quvchilar jurnali" },
        ]}
      />

      <PageHeader
        title="O'quvchilar jurnali"
        description="Har bir o'quvchi avtomaktab o'rtachasiga nisbatan. Guruhini o'zgartirish, parolini tiklash va hisobini bloklash shu yerdan."
        actions={<NewStudentModal groups={groups} />}
      />

      <SummaryStrip
        items={[
          { label: "O'quvchilar", value: overview.studentCount },
          {
            label: "O'rtacha ball",
            value: overview.averageScore === null ? "—" : `${overview.averageScore}%`,
          },
          { label: "Jim", value: counts.jim, hint: `${INACTIVE_DAYS}+ kun` },
          {
            label: "Bloklangan",
            value: overview.blockedStudentCount,
          },
        ]}
      />

      <div className="space-y-3">
        <FilterChips
          basePath="/director/oquvchilar"
          active={filter}
          keepParams={{ q: q || undefined, group: group || undefined }}
          options={[
            { value: "", label: "Hammasi", count: students.length },
            { value: "etibor", label: "Diqqat talab qiladi", count: counts.etibor },
            { value: "jim", label: "Jim", count: counts.jim },
            ...(paymentSettings.enabled
              ? [{ value: "tolov", label: "To'lovi tugagan", count: counts.tolov }]
              : []),
            { value: "bloklangan", label: "Bloklangan", count: counts.bloklangan },
          ]}
        />
        <StudentFilters groups={groups} basePath="/director/oquvchilar" />
      </div>

      <Card className="p-0 sm:p-0">
        {totalStudentCount === 0 ? (
          <EmptyState
            icon="users"
            title="Hozircha o'quvchi yo'q"
            description="Birinchi o'quvchini qo'shing — u guruhga biriktiriladi va darhol test ishlay boshlaydi."
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="search"
            title="Hech narsa topilmadi"
            description="Filtrni o'zgartiring yoki qidiruvni tozalang."
            action={{ href: "/director/oquvchilar", label: "Filtrni tozalash" }}
          />
        ) : (
          <>
            <StudentsTable
              students={rows}
              groups={groups}
              showProgress={true}
              studentBasePath="/oquvchi"
              organizationAverage={overview.averageScore}
              groupBasePath="/guruh"
              tutorBasePath="/ustoz"
              // To'lov o'chiq bo'lsa ustun ham, "Naqd" tugmasi ham ko'rsatilmaydi.
              payments={
                paymentSettings.enabled
                  ? {
                      byStudent: Object.fromEntries(
                        paymentColumn.map(({ studentId, ...rest }) => [studentId, rest])
                      ),
                      prices: {
                        1: paymentSettings.priceOneMonth!,
                        6: paymentSettings.priceSixMonths!,
                      },
                    }
                  : null
              }
            />
            <div className="border-t border-border px-4 py-3 sm:px-5">
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-text-muted">
                <span className="flex items-center gap-1.5 font-semibold text-text">
                  <Icon name="users" className="h-4 w-4 text-text-faint" />
                  {isFiltered
                    ? `${rows.length} ta ko'rsatilmoqda`
                    : `Jami ${rows.length} ta o'quvchi`}
                </span>
                {isFiltered && <span>{totalStudentCount} tadan</span>}
              </p>
              <CompareLegend average={overview.averageScore} />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
