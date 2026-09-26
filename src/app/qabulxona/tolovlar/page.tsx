import { requireRole } from "@/lib/auth";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { PendingReceiptsCard } from "@/components/PendingReceiptsCard";
import { StudentPaymentsTable } from "@/components/StudentPaymentsTable";
import {
  listPendingStudentPayments,
  listReviewedStudentPayments,
} from "@/services/studentPayments";

/**
 * Qabulxona to'lovlari.
 *
 * Direktornikidan farqi: SOZLAMALAR bo'limi yo'q. Karta raqami va
 * narxlarni faqat direktor o'zgartiradi — kartani almashtira oladigan
 * xodim butun avtomaktabning pul oqimini o'ziga burib yubora olardi
 * (`docs/rollar.md`, o'zgarmas qoida 1).
 */
export default async function ReceptionPaymentsPage() {
  const user = await requireRole("RECEPTION");
  if (!user.organizationId) {
    return (
      <p className="text-sm text-text-muted">
        Siz hech qaysi avtomaktabga biriktirilmagansiz. Direktoringizga murojaat qiling.
      </p>
    );
  }

  const [pending, reviewed] = await Promise.all([
    listPendingStudentPayments(user.organizationId),
    listReviewedStudentPayments(user.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[26px] font-bold tracking-[-0.04em] text-text sm:text-[30px]">
        To&apos;lovlar
      </h1>
        <p className="mt-1 text-sm text-text-muted">
          {user.switches.receptionHandlesPayments
            ? "Chekni tasdiqlashdan oldin kartaga pul tushganini tekshiring. Naqd to'lov \"O'quvchilar\" sahifasida belgilanadi."
            : "Cheklarni direktor tasdiqlaydi. Bu yerda ular faqat ko'rinadi."}
        </p>
      </div>

      <PendingReceiptsCard
        pending={pending}
        canReview={user.switches.receptionHandlesPayments}
      />

      <Card>
        <CardHeader>
          <CardTitle>To&apos;lovlar tarixi</CardTitle>
        </CardHeader>
        {reviewed.length === 0 ? (
          <p className="text-sm text-text-muted">Hali ko&apos;rib chiqilgan to&apos;lov yo&apos;q.</p>
        ) : (
          <StudentPaymentsTable payments={reviewed} showStudent={true} />
        )}
      </Card>
    </div>
  );
}
