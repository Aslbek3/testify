import Link from "next/link";
import { requireRole } from "@/lib/auth";
import {
  listOrganizations,
  type OrganizationSortDirection,
  type OrganizationSortField,
} from "@/services/organizations";
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
import { OrganizationFilters } from "./OrganizationFilters";
import type { OrganizationStatus } from "@prisma/client";

// `sort` searchParam kodlash: "<maydon>-<yo'nalish>", masalan "name-asc",
// "studentCount-desc", "createdAt-asc". Standart (parametr bo'lmaganda):
// "createdAt-desc" — bu avvalgi (o'zgarmagan) tartib bilan bir xil.
const SORT_OPTIONS = {
  "name-asc": { field: "name", direction: "asc" },
  "name-desc": { field: "name", direction: "desc" },
  "studentCount-asc": { field: "studentCount", direction: "asc" },
  "studentCount-desc": { field: "studentCount", direction: "desc" },
  "createdAt-asc": { field: "createdAt", direction: "asc" },
  "createdAt-desc": { field: "createdAt", direction: "desc" },
} satisfies Record<
  string,
  { field: OrganizationSortField; direction: OrganizationSortDirection }
>;

type SortKey = keyof typeof SORT_OPTIONS;

const DEFAULT_SORT: SortKey = "createdAt-desc";

const VALID_STATUSES: OrganizationStatus[] = ["ACTIVE", "TRIAL", "EXPIRED"];

function isSortKey(value: string | undefined): value is SortKey {
  return !!value && value in SORT_OPTIONS;
}

function buildHref(params: { q?: string; status?: string; sort?: string }) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status) search.set("status", params.status);
  if (params.sort) search.set("sort", params.sort);
  const qs = search.toString();
  return qs ? `/owner?${qs}` : "/owner";
}

export default async function OwnerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; status?: string }>;
}) {
  await requireRole("OWNER");
  const { q, sort, status } = await searchParams;

  const sortKey = isSortKey(sort) ? sort : DEFAULT_SORT;
  const { field: sortField, direction: sortDirection } = SORT_OPTIONS[sortKey];
  const statusFilter =
    status && VALID_STATUSES.includes(status as OrganizationStatus)
      ? (status as OrganizationStatus)
      : undefined;

  // Statistik plitkalar butun platforma bo'yicha bo'lishi kerak (filtrlarga
  // bog'liq bo'lmasin), shuning uchun ular uchun filtrlanmagan ro'yxat
  // alohida olinadi. Jadval esa filtrlangan/saralangan ro'yxatni ko'rsatadi.
  const allOrganizations = await listOrganizations();
  const organizations = await listOrganizations({
    q,
    status: statusFilter,
    sortField,
    sortDirection,
  });

  const activeCount = allOrganizations.filter((o) => o.status === "ACTIVE").length;
  const activeStudents = allOrganizations
    .filter((o) => o.status === "ACTIVE")
    .reduce((sum, o) => sum + o.studentCount, 0);

  function sortHref(field: OrganizationSortField) {
    const nextDirection: OrganizationSortDirection =
      sortField === field && sortDirection === "asc" ? "desc" : "asc";
    return buildHref({ q, status, sort: `${field}-${nextDirection}` });
  }

  function sortIndicator(field: OrganizationSortField) {
    if (sortField !== field) return null;
    return <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div className="space-y-6">
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
            organizations={allOrganizations.map((o) => ({ id: o.id, name: o.name }))}
          />
          <NewOrganizationModal />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile
          emphasis="primary"
          label="Jami faol o'quvchilar"
          value={activeStudents}
          sub="Faol tashkilotlardagi o'quvchilar"
        />
        <StatTile label="Jami tashkilotlar" value={allOrganizations.length} />
        <StatTile label="Faol tashkilotlar" value={activeCount} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tashkilotlar</CardTitle>
          <span className="text-sm text-text-muted">
            {organizations.length} ta tashkilot
          </span>
        </CardHeader>

        <OrganizationFilters />

        {allOrganizations.length === 0 ? (
          <p className="text-sm text-text-muted">
            Hozircha birorta tashkilot qo&apos;shilmagan.
          </p>
        ) : organizations.length === 0 ? (
          <div className="space-y-3 py-6 text-center">
            <p className="text-sm text-text-muted">Hech narsa topilmadi</p>
            <Link href="/owner">
              <Button type="button" variant="secondary">
                Filtrni tozalash
              </Button>
            </Link>
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell className="!p-0">
                  <Link href={sortHref("name")} className="block px-3 py-2">
                    Tashkilot
                    {sortIndicator("name")}
                  </Link>
                </TableHeaderCell>
                <TableHeaderCell>Shahar</TableHeaderCell>
                <TableHeaderCell>Reja</TableHeaderCell>
                <TableHeaderCell>Holat</TableHeaderCell>
                <TableHeaderCell align="right">Ustozlar</TableHeaderCell>
                <TableHeaderCell align="right" className="!p-0">
                  <Link
                    href={sortHref("studentCount")}
                    className="block px-3 py-2"
                  >
                    O&apos;quvchilar
                    {sortIndicator("studentCount")}
                  </Link>
                </TableHeaderCell>
                <TableHeaderCell className="!p-0">
                  <Link href={sortHref("createdAt")} className="block px-3 py-2">
                    Ro&apos;yxatdan o&apos;tgan
                    {sortIndicator("createdAt")}
                  </Link>
                </TableHeaderCell>
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
  );
}
