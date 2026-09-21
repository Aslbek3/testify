import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { canViewOrganization } from "@/lib/permissions";
import {
  getOrganizationOverview,
  getTutorRanking,
  listReceptionStaff,
  getGroupsOverview,
  listTutorsForOrganization,
  getDailyActivity,
  GROUP_NAME_MAX_LENGTH,
} from "@/services/directorDashboard";
import {
  getSubscriptionSummary,
  listPaymentsForOrganization,
} from "@/services/payments";
import { getOrganizationSwitches } from "@/services/organizationSettings";
import { getDirectorTasks } from "@/services/tasks";
import { getUserName } from "@/services/users";
import { SubscriptionCard, PaymentHistoryCard } from "./SubscriptionCard";
import { ORGANIZATION_BILLING_UI_ENABLED } from "@/lib/payments";
import { NewStaffModal } from "./NewStaffModal";
import { ReceptionStaffTable } from "./ReceptionStaffTable";
import { RoleSettingsForm } from "./RoleSettingsForm";
import { NewGroupModal } from "./NewGroupModal";
import { StatTile } from "@/components/StatTile";
import { Card, CardHeader, CardTitle, CardNote } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { TaskCard } from "@/components/TaskCard";
import { CompareBar } from "@/components/CompareBar";
import {
  ActivityChart,
  parseActivityPeriod,
} from "@/components/ActivityChart";
import { EmptyState } from "@/components/EmptyState";
import { Icon, type IconName } from "@/components/Icon";
import { cn } from "@/lib/cn";
import { readinessFromScore } from "@/lib/readiness";

/**
 * Direktor paneli.
 *
 * Tuzilishi uch qavat:
 *  1. Ko'rsatkichlar — "hamma narsa qanday?"
 *  2. Bugungi ish — "bugun nima qilishim kerak?"
 *  3. Jurnallarga kirish — "qaysi biri orqada qolyapti?" (batafsili u yerda)
 *
 * To'liq ro'yxatlar (guruhlar, ustozlar, o'quvchilar) ataylab bu yerda
 * EMAS — ular uchun uchta jurnal bor. Panel ilgari to'rtta uzun jadvalni
 * ketma-ket chizardi va ularning hech biriga chuqur qaralmasdi.
 */

/** Jurnalga kirish plitkasi — bo'limning jonli xulosasi bilan. */
function HubTile({
  href,
  icon,
  tone,
  title,
  summary,
  chips,
}: {
  href: string;
  icon: IconName;
  tone: string;
  title: string;
  summary: string;
  chips: { label: string; variant: "ok" | "warn" | "mute" }[];
}) {
  const CHIP_CLASS = {
    ok: "bg-brand-soft text-brand",
    warn: "bg-warning-soft text-warning",
    mute: "bg-surface-2 text-text-muted",
  } as const;

  return (
    <Link
      href={href}
      className="block rounded-lg border border-border bg-bg p-4 shadow-card transition-all hover:border-brand/40 hover:shadow-raised"
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            tone
          )}
        >
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[15px] font-bold text-text">
            {title}
          </span>
          <span className="block text-[12px] text-text-muted">{summary}</span>
        </span>
        <Icon name="chevronRight" className="h-[18px] w-[18px] text-text-faint" />
      </div>
      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip.label}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-bold",
                CHIP_CLASS[chip.variant]
              )}
            >
              {chip.label}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

export default async function DirectorPage({
  searchParams,
}: {
  searchParams: Promise<{ kun?: string }>;
}) {
  const user = await requireRole("DIRECTOR");
  // Grafik davri URL'da: holat saqlanadi va havolani yuborish mumkin.
  const { kun } = await searchParams;
  const period = parseActivityPeriod(kun);

  if (!user.organizationId || !canViewOrganization(user, user.organizationId)) {
    return (
      <p className="text-sm text-text-muted">
        Tashkilotga biriktirilmagansiz. Iltimos, administrator bilan
        bog&apos;laning.
      </p>
    );
  }

  const organizationId = user.organizationId;

  const [
    overview,
    tutorRanking,
    receptionStaff,
    switches,
    groups,
    tutors,
    subscription,
    payments,
    tasks,
    userName,
    activity,
  ] = await Promise.all([
    getOrganizationOverview(organizationId),
    getTutorRanking(organizationId),
    listReceptionStaff(organizationId),
    getOrganizationSwitches(organizationId),
    getGroupsOverview(organizationId),
    listTutorsForOrganization(organizationId),
    // O'chiq bo'lsa so'rov umuman yuborilmaydi — natija baribir chizilmaydi.
    ORGANIZATION_BILLING_UI_ENABLED ? getSubscriptionSummary(organizationId) : null,
    ORGANIZATION_BILLING_UI_ENABLED ? listPaymentsForOrganization(organizationId) : null,
    getDirectorTasks(organizationId, user.id),
    getUserName(user.id),
    getDailyActivity(organizationId, period),
  ]);

  // Plitkalar uchun jonli xulosa — jurnal ochmasdan ham holatni bildiradi.
  const readyGroups = groups.filter(
    (g) => g.averageScore !== null && readinessFromScore(g.averageScore).variant === "success"
  ).length;
  const weakGroups = groups.filter(
    (g) => g.averageScore !== null && readinessFromScore(g.averageScore).variant !== "success"
  ).length;
  const emptyGroups = groups.filter((g) => g.studentCount === 0).length;
  const tutorsWithoutGroup = tutorRanking.filter((t) => t.groups.length === 0).length;

  // Panelda faqat eng zaif beshtasi — to'liq ro'yxat jurnalda.
  const weakestTutors = [...tutorRanking]
    .filter((t) => t.averageScore !== null)
    .sort((a, b) => (a.averageScore ?? 0) - (b.averageScore ?? 0))
    .slice(0, 5);

  return (
    <div className="space-y-5">
      <PageHeader
        title={userName ? `Xush kelibsiz, ${userName}` : "Direktor paneli"}
        description="Bugungi holat: ko'rsatkichlar, hal qilinishi kerak bo'lgan ishlar va bo'limlar."
        actions={
          <>
            <NewStaffModal role="TUTOR" />
            <NewGroupModal tutors={tutors} nameMaxLength={GROUP_NAME_MAX_LENGTH} />
          </>
        }
      />

      {/* Obuna kartochkasi tepada: muddat tugayotgan bo'lsa, direktor
          buni statistikadan oldin ko'rishi kerak. */}
      {subscription && <SubscriptionCard summary={subscription} />}

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatTile
          icon="trophy"
          tone="brand"
          label="O'rtacha ball"
          value={overview.averageScore === null ? "—" : `${overview.averageScore}%`}
          sub={
            overview.averageScore === null
              ? "Hali imtihon topshirilmagan"
              : "Imtihonlar bo'yicha, o'quvchi kesimida"
          }
        />
        <StatTile
          icon="users"
          tone="info"
          label="O'quvchilar"
          value={overview.studentCount}
          sub={
            overview.blockedStudentCount > 0
              ? `${overview.blockedStudentCount} tasi bloklangan`
              : "Hammasi faol"
          }
        />
        <StatTile
          icon="building"
          tone="purple"
          label="Guruhlar"
          value={overview.groupCount}
          sub={
            overview.groupCount > 0
              ? `o'rtacha ${Math.round(overview.studentCount / overview.groupCount)} o'quvchidan`
              : undefined
          }
        />
        <StatTile
          icon="graduationCap"
          tone="warning"
          label="Ustozlar"
          value={overview.tutorCount}
          sub={
            receptionStaff.length > 0
              ? `${receptionStaff.length} ta qabulxona xodimi`
              : "Qabulxona xodimi yo'q"
          }
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(290px,0.65fr)]">
        <div className="space-y-5">
          <ActivityChart
            points={activity}
            period={period}
            basePath="/director"
          />
          <Card>
            <CardHeader>
              <CardTitle icon="chart">Eng ko&apos;p e&apos;tibor talab qiladiganlar</CardTitle>
              <Link
                href="/director/ustozlar"
                className="text-[12.5px] font-bold text-brand hover:underline"
              >
                Ustozlar jurnali →
              </Link>
            </CardHeader>

            {weakestTutors.length === 0 ? (
              <EmptyState
                icon="chart"
                title="Tahlil hali tayyor emas"
                description="Ustozlar reytingi imtihon natijalari asosida hisoblanadi — hali birorta imtihon topshirilmagan."
              />
            ) : (
              <ul className="space-y-3">
                {weakestTutors.map((tutor) => (
                  <li key={tutor.tutorId} className="flex items-center gap-3">
                    <Link
                      href={`/ustoz/${tutor.tutorId}`}
                      className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-text hover:text-brand"
                    >
                      {tutor.tutorName}
                      <span className="ml-2 font-normal text-text-faint">
                        {tutor.groups.length > 0
                          ? tutor.groups.map((g) => g.name).join(", ")
                          : "guruhsiz"}
                      </span>
                    </Link>
                    <div className="w-[170px] shrink-0">
                      <CompareBar
                        value={tutor.averageScore}
                        average={overview.averageScore}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          {/* Jurnallarga kirish — ogohlantirish emas, bo'limga eshik.
              Shuning uchun chap chiziq ham, qizil rang ham yo'q.
              O'ng ustunda ustun bo'lib turadi: chapdagi grafik va
              ro'yxat kengroq joyni talab qiladi. */}
          <div className="grid gap-3.5 sm:grid-cols-3 lg:grid-cols-1">
            <HubTile
              href="/director/guruhlar"
              icon="building"
              tone="bg-brand-soft text-brand"
              title="Guruhlar"
              summary={`${overview.groupCount} ta · ${overview.studentCount} o'quvchi`}
              chips={[
                ...(readyGroups > 0
                  ? [{ label: `${readyGroups} tayyor`, variant: "ok" as const }]
                  : []),
                ...(weakGroups > 0
                  ? [{ label: `${weakGroups} e'tibor`, variant: "warn" as const }]
                  : []),
                ...(emptyGroups > 0
                  ? [{ label: `${emptyGroups} bo'sh`, variant: "mute" as const }]
                  : []),
              ]}
            />
            <HubTile
              href="/director/ustozlar"
              icon="graduationCap"
              tone="bg-purple-soft text-purple"
              title="Ustozlar"
              summary={`${overview.tutorCount} ta ustoz`}
              chips={
                tutorsWithoutGroup > 0
                  ? [{ label: `${tutorsWithoutGroup} guruhsiz`, variant: "mute" as const }]
                  : []
              }
            />
            <HubTile
              href="/director/oquvchilar"
              icon="users"
              tone="bg-info-soft text-info"
              title="O'quvchilar"
              summary={`${overview.studentCount} ta o'quvchi`}
              chips={
                overview.blockedStudentCount > 0
                  ? [
                      {
                        label: `${overview.blockedStudentCount} bloklangan`,
                        variant: "mute" as const,
                      },
                    ]
                  : []
              }
            />
          </div>

          <TaskCard tasks={tasks} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {switches && (
          <Card>
            <CardHeader>
              <CardTitle icon="shield">Ruxsatlar</CardTitle>
              <CardNote>Kim nima qila oladi</CardNote>
            </CardHeader>
            <p className="mb-4 text-[13px] leading-relaxed text-text-muted">
              Bu kalitlar faqat shu avtomaktabga tegishli. Karta raqami, narxlar,
              xodim yaratish va guruh tuzilishi har doim sizda qoladi.
            </p>
            <RoleSettingsForm switches={switches} />
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle icon="user">Qabulxona xodimlari</CardTitle>
            <div className="flex items-center gap-2">
              <CardNote>{receptionStaff.length} ta xodim</CardNote>
              <NewStaffModal role="RECEPTION" />
            </div>
          </CardHeader>

          {receptionStaff.length === 0 ? (
            <EmptyState
              icon="user"
              title="Qabulxona hisobi ochilmagan"
              description="Qabulxona xodimi o'quvchi qo'shadi, guruhga joylaydi va (kalit yoqilgan bo'lsa) to'lovlarni qabul qiladi — texnik ishlar sizdan va ustozdan olinadi."
            />
          ) : (
            <ReceptionStaffTable rows={receptionStaff} />
          )}
        </Card>
      </div>

      {/* Tarix eng pastda: u kundalik ish uchun emas, faqat "xabarim
          qabul qilindimi / nega rad etildi" degan savol uchun kerak. */}
      {payments && <PaymentHistoryCard payments={payments} />}
    </div>
  );
}
