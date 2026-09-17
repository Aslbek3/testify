import { requireRole } from "@/lib/auth";
import {
  getStudentPaymentSettings,
  listPendingStudentPayments,
  listReviewedStudentPayments,
} from "@/services/studentPayments";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { StudentPaymentsTable } from "@/components/StudentPaymentsTable";
import { PendingReceiptsCard } from "@/components/PendingReceiptsCard";
import { PaymentSettingsForm } from "./PaymentSettingsForm";

export default async function DirectorPaymentsPage() {
  const user = await requireRole("DIRECTOR");
  if (!user.organizationId) {
    return (
      <p className="text-sm text-text-muted">Siz hech qaysi avtomaktabga biriktirilmagansiz.</p>
    );
  }

  const [settings, pending, reviewed] = await Promise.all([
    getStudentPaymentSettings(user.organizationId),
    listPendingStudentPayments(user.organizationId),
    listReviewedStudentPayments(user.organizationId),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-semibold text-text">To&apos;lovlar</h1>

      {/* Kutayotgan cheklar eng tepada — bu kechiktirib bo'lmaydigan ish:
          o'quvchi pulni o'tkazgan, tasdiqlanmaguncha muddati uzaymaydi.
          Ro'yxatning o'zi komponentda: qabulxona ham aynan shuni ko'radi. */}
      <PendingReceiptsCard pending={pending} canReview={true} />

      <Card>
        <CardHeader>
          <CardTitle>Sozlamalar</CardTitle>
        </CardHeader>
        <PaymentSettingsForm settings={settings} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>To&apos;lovlar tarixi</CardTitle>
        </CardHeader>
        {reviewed.length === 0 ? (
          <p className="text-sm text-text-muted">
            Hali ko&apos;rib chiqilgan to&apos;lov yo&apos;q. Naqd to&apos;lovni
            &quot;O&apos;quvchilar&quot; sahifasida belgilaysiz.
          </p>
        ) : (
          <StudentPaymentsTable payments={reviewed} showStudent={true} />
        )}
      </Card>
    </div>
  );
}
