import Link from "next/link";
import { requireRole } from "@/lib/auth";
import {
  listOrganizations,
  listOrganizationOptions,
  getPlatformOverview,
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
import { listPendingPayments } from "@/services/payments";
import { extendSubscription, getSubscriptionState } from "@/lib/subscription";
import { NewOrganizationModal } from "./NewOrganizationModal";
import { EditOrganizationModal } from "./EditOrganizationModal";
import { NewDirectorModal } from "./NewDirectorModal";
import { OrganizationFilters } from "./OrganizationFilters";
import {
  PendingPaymentsCard,
  type PendingPaymentReview,
} from "./PendingPaymentsCard";
import type { OrganizationStatus } from "@prisma/client";
import type { OrganizationWithCounts } from "@/services/organizations";

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

/**
 * Jadvaldagi "Obuna muddati" katagi.
 *
 * Holat ATAYLAB bu yerda hisoblanmaydi — `getSubscriptionState()` yagona
 * manba. Aks holda UI "tugagan" deb ko'rsatib, `requireRole()` esa hali
 * imtiyoz muddati borligi uchun kirishga ruxsat berib turishi mumkin edi.
 */
function SubscriptionCell({ organization }: { organization: OrganizationWithCounts }) {
  const endsAt = organization.subscriptionEndsAt;

  // Muddat belgilanmagan (sinov davri yoki eski tashkilot) — faqat
  // "Holat" ustuni ma'no beradi.
  if (!endsAt) return <span className="text-text-muted">—</span>;

  const state = getSubscriptionState({
    status: organization.status,
    subscriptionEndsAt: endsAt,
  });

  if (state.kind === "blocked") {
    return <Badge variant="danger">{formatDate(endsAt)}</Badge>;
  }

  if (state.kind === "grace") {
    // Imtiyoz muddati — sana o'tib ketgan, lekin kirish hali ochiq.
    // Bu owner uchun eng muhim holat: aynan shu kunlarda to'lov kutiladi.
    return (
      <span className="text-warning">
        ⚠ {formatDate(endsAt)}
        <span className="block text-xs">
          Imtiyoz muddati: {state.daysLeft} kun
        </span>
      </span>
    );
  }

  return <>{formatDate(endsAt)}</>;
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
  // bog'liq bo'lmasin). Ilgari buning uchun `listOrganizations()` ikkinchi
  // marta — filtrsiz — chaqirilar va natijasidan faqat uchta yig'indi
  // olinardi; endi shu yig'indilar bazada sanaladi. Jadval esa
  // filtrlangan/saralangan ro'yxatni ko'rsatadi.
  const [overview, organizationOptions, organizations, pendingPayments] =
    await Promise.all([
      getPlatformOverview(),
      listOrganizationOptions(),
      listOrganizations({ q, status: statusFilter, sortField, sortDirection }),
      listPendingPayments(),
    ]);

  // Tasdiqlansa obuna qaysi sanagacha uzayishini ko'rsatish uchun
  // tashkilotning HOZIRGI muddati kerak — u `listPendingPayments()`
  // qatoridayoq keladi (`organizationSubscriptionEndsAt`), shuning uchun
  // bu yerda qo'shimcha so'rov yo'q.
  //
  // Sana ATAYLAB `extendSubscription()` bilan hisoblanadi — tasdiqlash
  // paytida server ham aynan shu funksiyani chaqiradi. Formulani bu yerda
  // takrorlash "ko'rsatilgan sana" bilan "haqiqiy sana" ni ajratib
  // yuborardi.
  const pendingReviews: PendingPaymentReview[] = pendingPayments.map(
    (payment) => ({
      payment,
      nextEndsAt: extendSubscription(
        payment.organizationSubscriptionEndsAt,
        payment.months
      ),
    })
  );

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
          <NewDirectorModal organizations={organizationOptions} />
          <NewOrganizationModal />
        </div>
      </div>

      {/* Kutayotgan to'lov statistikadan ham OLDIN turadi — u yagona
          kechiktirib bo'lmaydigan ish. Kutayotgan to'lov bo'lmasa
          komponent `null` qaytaradi va bu yerda hech narsa chizilmaydi. */}
      <PendingPaymentsCard items={pendingReviews} />

      {/* Yorliqlarda "faol" so'zi ikki xil narsani anglatardi: hisob
          bloklanmaganini va tashkilot holati ACTIVE ekanini. Endi har bir
          plitka nimani sanashini aniq yozadi. "primary" plitka ikki ustunni
          egallagani uchun to'rtta plitka jami beshta katak. */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatTile
          emphasis="primary"
          label="Faol tashkilotlardagi o'quvchilar"
          value={overview.activeOrganizationStudentCount}
          sub="Bloklanmagan hisoblar"
        />
        <StatTile
          label="Jami o'quvchilar"
          value={overview.studentCount}
          sub="Barcha tashkilotlar"
        />
        <StatTile label="Jami tashkilotlar" value={overview.organizationCount} />
        <StatTile
          label="Faol tashkilotlar"
          value={overview.activeOrganizationCount}
          sub="Holati: Faol"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tashkilotlar</CardTitle>
          <span className="text-sm text-text-muted">
            {organizations.length} ta tashkilot
          </span>
        </CardHeader>

        <OrganizationFilters />

        <p className="mb-3 text-sm text-text-muted">
          Ustozlar va o&apos;quvchilar ustunlari faqat bloklanmagan hisoblarni
          sanaydi.
        </p>

        {overview.organizationCount === 0 ? (
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
                {/* "Holat" tashkilot qaysi rejimda ekanini aytadi, bu ustun
                    esa u QACHONGACHA amal qilishini — ikkalasi ham kerak:
                    holat "Faol" bo'lsa ham muddat ertaga tugashi mumkin. */}
                <TableHeaderCell>Obuna muddati</TableHeaderCell>
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
                <TableHeaderCell align="right">Amallar</TableHeaderCell>
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
                  <TableCell>
                    <SubscriptionCell organization={org} />
                  </TableCell>
                  <TableCell align="right">{org.tutorCount}</TableCell>
                  <TableCell align="right">{org.studentCount}</TableCell>
                  <TableCell>{formatDate(org.createdAt)}</TableCell>
                  <TableCell align="right">
                    <EditOrganizationModal organization={org} />
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
