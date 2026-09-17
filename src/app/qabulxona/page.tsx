import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { StatTile } from "@/components/StatTile";
import { describeStudentAccess } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { EXPIRING_SOON_DAYS, getReceptionOverview } from "@/services/reception";

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

  const overview = await getReceptionOverview(user.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Qabulxona</h1>
        <p className="mt-1 text-sm text-text-muted">
          Bugungi ish: muddati tugayotganlarga qo&apos;ng&apos;iroq qilish va
          kelgan cheklarni ko&apos;rib chiqish.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile
          emphasis="primary"
          label="Kutayotgan cheklar"
          value={overview.pendingPaymentCount}
          sub={overview.pendingPaymentCount > 0 ? "Ko'rib chiqilmagan" : "Hammasi ko'rilgan"}
        />
        <StatTile label="O'quvchilar" value={overview.studentCount} />
        <StatTile
          label="Muddati tugayapti"
          value={overview.expiringSoon.length}
          sub={`${EXPIRING_SOON_DAYS} kun ichida`}
        />
        <StatTile label="Bugun qo'shilgan" value={overview.addedToday.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Muddati tugayotganlar</CardTitle>
          <Link href="/qabulxona/oquvchilar" className="text-sm text-brand hover:underline">
            Barcha o&apos;quvchilar
          </Link>
        </CardHeader>

        {overview.expiringSoon.length === 0 ? (
          <p className="text-sm text-text-muted">
            Yaqin {EXPIRING_SOON_DAYS} kun ichida muddati tugaydigan o&apos;quvchi yo&apos;q.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {overview.expiringSoon.map((student) => {
              const label = describeStudentAccess(student.access);
              return (
                <li
                  key={student.studentId}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">{student.name}</p>
                    <p className="text-sm text-text-muted">
                      {student.groupName ?? "Guruhsiz"} ·{" "}
                      {/* Telefon maydoni hozircha to'ldirilmaydi — shunda
                          qabulxona email orqali bog'lanadi. */}
                      {student.phone ?? student.email}
                    </p>
                  </div>
                  <span className="flex items-center gap-2">
                    {label.detail && (
                      <span className="text-sm text-text-muted">{label.detail}</span>
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
          <CardTitle>Bugun qo&apos;shilganlar</CardTitle>
        </CardHeader>
        {overview.addedToday.length === 0 ? (
          <p className="text-sm text-text-muted">Bugun yangi o&apos;quvchi qo&apos;shilmagan.</p>
        ) : (
          <ul className="divide-y divide-border">
            {overview.addedToday.map((student) => (
              <li
                key={student.studentId}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="text-sm text-text">{student.name}</span>
                <span className="text-sm text-text-muted">
                  {student.groupName ?? "Guruhsiz"} · {formatDate(student.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
