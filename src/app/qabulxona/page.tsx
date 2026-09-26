import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardNote } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { TaskCard } from "@/components/TaskCard";
import { Badge } from "@/components/Badge";
import { StatTile } from "@/components/StatTile";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { describeStudentAccess } from "@/lib/labels";
import { formatDate, formatAmountUzs } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { EXPIRING_SOON_DAYS, getReceptionOverview } from "@/services/reception";
import { getReceptionTasks } from "@/services/tasks";
import { getUserName } from "@/services/users";

/**
 * Qabulxonaning kunlik ish taxtasi.
 *
 * Boshqa panellar statistika ko'rsatadi, bu esa ISH RO'YXATI beradi:
 * kimga qo'ng'iroq qilish kerak, qaysi chek kutyapti. Shuning uchun
 * o'rtacha ball va mavzular tahlili bu yerda yo'q — ular qabulxonaning
 * ishi emas.
 */
export default async function ReceptionHomePage() {
  const user = await requireRole("RECEPTION");
  if (!user.organizationId) {
    return (
      <p className="text-sm text-text-muted">
        Siz hech qaysi avtomaktabga biriktirilmagansiz. Direktoringizga murojaat qiling.
      </p>
    );
  }

  const [overview, tasks, userName] = await Promise.all([
    getReceptionOverview(user.organizationId),
    getReceptionTasks(
      user.organizationId,
      user.id,
      // Kalit direktor sozlamasidan keladi — qabulxona pul bilan
      // ishlamasa, chek haqidagi ish ro'yxatga umuman qo'shilmaydi.
      user.switches.receptionHandlesPayments
    ),
    getUserName(user.id),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={userName ? `Xush kelibsiz, ${userName}` : "Qabulxona"}
        description="Bugungi ish: muddati tugayotganlarga qo'ng'iroq qilish va kelgan cheklarni ko'rib chiqish."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            <StatTile
              icon="wallet"
              tone="brand"
              label="Kutayotgan cheklar"
              value={overview.pendingPaymentCount}
              // Summa aynan shu yerda: "3 ta chek" qancha pul ekanini
              // aytmaydi, qabulxona uchun esa ish tartibi shunga bog'liq.
              sub={
                overview.pendingPaymentCount > 0
                  ? formatAmountUzs(overview.pendingPaymentAmount)
                  : "Hammasi ko'rilgan"
              }
            />
            <StatTile
              icon="users"
              tone="info"
              label="O'quvchilar"
              value={overview.studentCount}
            />
            <StatTile
              icon="clock"
              tone="warning"
              label="Muddati tugayapti"
              value={overview.expiringSoon.length}
              sub={`${EXPIRING_SOON_DAYS} kun ichida`}
            />
            <StatTile
              icon="plus"
              tone="purple"
              label="Bugun qo'shilgan"
              value={overview.addedToday.length}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle icon="clock">Muddati tugayotganlar</CardTitle>
              <Link
                href="/qabulxona/oquvchilar"
                className="text-[12.5px] font-bold text-brand hover:underline"
              >
                Barcha o&apos;quvchilar →
              </Link>
            </CardHeader>

            {overview.expiringSoon.length === 0 ? (
              <EmptyState
                icon="check"
                title="Qo'ng'iroq qilish kerak emas"
                description={`Yaqin ${EXPIRING_SOON_DAYS} kun ichida muddati tugaydigan o'quvchi yo'q.`}
              />
            ) : (
              <ul className="divide-y divide-border-subtle">
                {overview.expiringSoon.map((student) => {
                  const label = describeStudentAccess(student.access);
                  return (
                    <li
                      key={student.studentId}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-semibold text-text">
                          {student.name}
                        </p>
                        <p className="text-[12px] text-text-muted">
                          {student.groupName ?? "Guruhsiz"} ·{" "}
                          {/* Telefon bo'lsa — o'sha: qabulxona o'quvchi bilan
                              telefon orqali gaplashadi. Eski yozuvlarda u
                              yo'q (maydon endi to'ldirila boshladi), shunda
                              email qoladi. */}
                          {student.phone ? (
                            <a
                              href={`tel:${student.phone}`}
                              className="font-mono tabular-nums text-brand underline-offset-2 hover:underline"
                            >
                              {formatPhone(student.phone)}
                            </a>
                          ) : (
                            student.email
                          )}
                        </p>
                      </div>
                      <span className="flex items-center gap-2">
                        {label.detail && (
                          <span className="text-[12px] text-text-faint">{label.detail}</span>
                        )}
                        <Badge variant={label.variant}>{label.label}</Badge>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle icon="plus">Bugun qo&apos;shilganlar</CardTitle>
              {overview.addedToday.length > 0 && (
                <CardNote>{overview.addedToday.length} ta</CardNote>
              )}
            </CardHeader>
            {overview.addedToday.length === 0 ? (
              <EmptyState
                icon="users"
                title="Bugun yangi o'quvchi qo'shilmagan"
                description="Yangi o'quvchi qo'shsangiz u shu yerda ko'rinadi — guruhi va to'lovi to'g'ri qo'yilganini tekshirish uchun."
                action={{ href: "/qabulxona/oquvchilar", label: "O'quvchilar ro'yxati" }}
              />
            ) : (
              <ul className="divide-y divide-border-subtle">
                {overview.addedToday.map((student) => (
                  <li
                    key={student.studentId}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="flex items-center gap-2 text-[13.5px] font-medium text-text">
                      <Icon name="user" className="h-4 w-4 text-text-faint" />
                      {student.name}
                    </span>
                    <span className="text-[12px] text-text-muted">
                      {student.groupName ?? "Guruhsiz"} ·{" "}
                      <span className="font-mono tabular-nums">
                        {formatDate(student.createdAt)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <TaskCard tasks={tasks} />
      </div>
    </div>
  );
}
