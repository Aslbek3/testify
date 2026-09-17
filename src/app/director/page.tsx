import { requireRole } from "@/lib/auth";
import { canViewOrganization } from "@/lib/permissions";
import {
  getOrganizationOverview,
  getTutorRanking,
  listReceptionStaff,
  getGroupsOverview,
  listTutorsForOrganization,
  GROUP_NAME_MAX_LENGTH,
} from "@/services/directorDashboard";
import {
  getSubscriptionSummary,
  listPaymentsForOrganization,
} from "@/services/payments";
import { getOrganizationSwitches } from "@/services/organizationSettings";
import { SubscriptionCard, PaymentHistoryCard } from "./SubscriptionCard";
import { ORGANIZATION_BILLING_UI_ENABLED } from "@/lib/payments";
import { NewStaffModal } from "./NewStaffModal";
import { ReceptionStaffTable } from "./ReceptionStaffTable";
import { RoleSettingsForm } from "./RoleSettingsForm";
import { NewGroupModal } from "./NewGroupModal";
import { TutorRankingTable } from "./TutorRankingTable";
import { GroupsTable } from "./GroupsTable";
import { StatTile } from "@/components/StatTile";
import { Card, CardHeader, CardTitle } from "@/components/Card";

export default async function DirectorPage() {
  const user = await requireRole("DIRECTOR");

  if (!user.organizationId || !canViewOrganization(user, user.organizationId)) {
    return (
      <p className="text-sm text-text-muted">
        Tashkilotga biriktirilmagansiz. Iltimos, administrator bilan
        bog&apos;laning.
      </p>
    );
  }

  const organizationId = user.organizationId;

  const [overview, tutorRanking, receptionStaff, switches, groups, tutors, subscription, payments] =
    await Promise.all([
      getOrganizationOverview(organizationId),
      getTutorRanking(organizationId),
      listReceptionStaff(organizationId),
      getOrganizationSwitches(organizationId),
      getGroupsOverview(organizationId),
      listTutorsForOrganization(organizationId),
      // O'chiq bo'lsa so'rov umuman yuborilmaydi — natija baribir chizilmaydi.
      ORGANIZATION_BILLING_UI_ENABLED ? getSubscriptionSummary(organizationId) : null,
      ORGANIZATION_BILLING_UI_ENABLED ? listPaymentsForOrganization(organizationId) : null,
    ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Direktor paneli</h1>
          <p className="mt-1 text-sm text-text-muted">
            Tashkilotingizdagi ustozlar va guruhlar bo&apos;yicha umumiy
            ko&apos;rsatkichlar shu yerda.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NewStaffModal role="TUTOR" />
          <NewStaffModal role="RECEPTION" />
          <NewGroupModal tutors={tutors} nameMaxLength={GROUP_NAME_MAX_LENGTH} />
        </div>
      </div>

      {/* Obuna kartochkasi tepada: muddat tugayotgan bo'lsa, direktor
          buni statistikadan oldin ko'rishi kerak. */}
      {subscription && <SubscriptionCard summary={subscription} />}

      {/* "primary" plitka ikki ustunni egallaydi (StatTile), shuning uchun
          to'rtta plitka jami beshta katak — setka ham shunga moslangan. */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatTile
          emphasis="primary"
          label="O'rtacha ball"
          value={overview.averageScore === null ? "—" : `${overview.averageScore}%`}
          sub={
            overview.averageScore === null
              ? "Imtihon topshirilmagan"
              : "Imtihonlar bo'yicha, o'quvchi kesimida"
          }
        />
        {/* Bu son ilgari hisoblanardi-yu, hech qayerda ko'rsatilmasdi. */}
        <StatTile
          label="Jami o'quvchilar"
          value={overview.studentCount}
          sub={
            overview.blockedStudentCount > 0
              ? `${overview.blockedStudentCount} tasi bloklangan`
              : undefined
          }
        />
        <StatTile label="Jami guruhlar" value={overview.groupCount} />
        <StatTile label="Jami ustozlar" value={overview.tutorCount} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ustozlar reytingi</CardTitle>
          <span className="text-sm text-text-muted">
            {tutorRanking.length} ta ustoz
          </span>
        </CardHeader>

        {tutorRanking.length === 0 ? (
          <p className="text-sm text-text-muted">Hozircha ustozlar yo&apos;q.</p>
        ) : (
          <TutorRankingTable rows={tutorRanking} />
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Qabulxona xodimlari</CardTitle>
          <span className="text-sm text-text-muted">{receptionStaff.length} ta xodim</span>
        </CardHeader>

        {receptionStaff.length === 0 ? (
          <p className="text-sm text-text-muted">
            Qabulxona hisobi ochilmagan. Ochilsa, u o&apos;quvchi qo&apos;shadi,
            guruhga joylaydi va (kalit yoqilgan bo&apos;lsa) to&apos;lovlarni
            qabul qiladi — texnik ishlar sizdan va ustozdan olinadi.
          </p>
        ) : (
          <ReceptionStaffTable rows={receptionStaff} />
        )}
      </Card>

      {switches && (
        <Card>
          <CardHeader>
            <CardTitle>Ruxsatlar</CardTitle>
            <span className="text-sm text-text-muted">Kim nima qila oladi</span>
          </CardHeader>
          <p className="mb-4 text-sm text-text-muted">
            Bu kalitlar faqat shu avtomaktabga tegishli. Karta raqami, narxlar,
            xodim yaratish va guruh tuzilishi har doim sizda qoladi.
          </p>
          <RoleSettingsForm switches={switches} />
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Guruhlar</CardTitle>
          <span className="text-sm text-text-muted">
            {groups.length} ta guruh · Guruh nomini bosing — to&apos;liq tahlil
            ochiladi
          </span>
        </CardHeader>

        {groups.length === 0 ? (
          <p className="text-sm text-text-muted">
            Hozircha guruhlar yo&apos;q. Yuqoridagi &quot;Guruh
            qo&apos;shish&quot; tugmasi orqali birinchi guruhni yarating.
          </p>
        ) : (
          <GroupsTable
            groups={groups}
            tutors={tutors}
            nameMaxLength={GROUP_NAME_MAX_LENGTH}
          />
        )}
      </Card>

      {/* Tarix eng pastda: u kundalik ish uchun emas, faqat "xabarim
          qabul qilindimi / nega rad etildi" degan savol uchun kerak. */}
      {payments && <PaymentHistoryCard payments={payments} />}
    </div>
  );
}
