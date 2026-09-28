import { requireRole } from "@/lib/auth";
import {
  getStudentPaymentSettings,
  listPendingStudentPayments,
  listReviewedStudentPayments,
} from "@/services/studentPayments";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { FilterChips, JournalSearch } from "@/components/JournalToolbar";
import { EmptyState } from "@/components/EmptyState";
import { StudentPaymentsTable } from "@/components/StudentPaymentsTable";
import { PendingReceiptsCard } from "@/components/PendingReceiptsCard";
import { PaymentSettingsForm } from "./PaymentSettingsForm";

export default async function DirectorPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; holat?: string }>;
}) {
  const user = await requireRole("DIRECTOR");
  const { q, holat } = await searchParams;
  const search = q?.trim() ?? "";
  const status = holat === "tasdiqlangan" ? "CONFIRMED" : holat === "rad" ? "REJECTED" : undefined;
  if (!user.organizationId) {
    return (
      <p className="text-sm text-text-muted">Siz hech qaysi avtomaktabga biriktirilmagansiz.</p>
    );
  }

  const [settings, pending, reviewed] = await Promise.all([
    getStudentPaymentSettings(user.organizationId),
    listPendingStudentPayments(user.organizationId),
    listReviewedStudentPayments(user.organizationId, { search, status }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="font-display text-[26px] font-bold tracking-[-0.04em] text-text sm:text-[30px]">
        To&apos;lovlar
      </h1>

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

        {/* Qidiruv va filtr: ilgari bu ro'yxat oxirgi 30 tasini
            ko'rsatardi va boshqa yo'l yo'q edi — direktor "Alisher
            to'laganmi?" degan savolga javob topolmasdi. */}
        <div className="mb-4 space-y-3">
          <JournalSearch
            basePath="/director/tolovlar"
            defaultValue={search}
            placeholder="O'quvchi ismi bo'yicha qidirish"
            keepParams={{ holat: holat || undefined }}
          />
          <FilterChips
            basePath="/director/tolovlar"
            active={holat ?? ""}
            paramName="holat"
            keepParams={{ q: search || undefined }}
            options={[
              { value: "", label: "Hammasi" },
              { value: "tasdiqlangan", label: "Tasdiqlangan" },
              { value: "rad", label: "Rad etilgan" },
            ]}
          />
        </div>

        {reviewed.length === 0 ? (
          <EmptyState
            icon={search || holat ? "search" : "wallet"}
            title={
              search || holat
                ? "Hech narsa topilmadi"
                : "Hali ko'rib chiqilgan to'lov yo'q"
            }
            description={
              search || holat
                ? "Boshqa ism bilan qidiring yoki filtrni tozalang."
                : "Naqd to'lovni \"O'quvchilar\" sahifasida belgilaysiz."
            }
            action={
              search || holat
                ? { href: "/director/tolovlar", label: "Filtrni tozalash" }
                : undefined
            }
          />
        ) : (
          <StudentPaymentsTable payments={reviewed} showStudent={true} />
        )}
      </Card>
    </div>
  );
}
