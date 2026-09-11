import { requireRole } from "@/lib/auth";
import { formatDate, formatAmountUzs } from "@/lib/format";
import {
  getStudentPaymentSettings,
  listPendingStudentPayments,
  listReviewedStudentPayments,
} from "@/services/studentPayments";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { StudentPaymentsTable } from "@/components/StudentPaymentsTable";
import { PaymentReviewActions } from "@/components/PaymentReviewActions";
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
          o'quvchi pulni o'tkazgan, tasdiqlanmaguncha muddati uzaymaydi. */}
      <Card className={pending.length > 0 ? "border-brand/50" : undefined}>
        <CardHeader>
          <CardTitle>Tasdiq kutayotgan cheklar</CardTitle>
          {pending.length > 0 && (
            <span className="text-sm text-text-muted">{pending.length} ta</span>
          )}
        </CardHeader>

        {pending.length === 0 ? (
          <p className="text-sm text-text-muted">
            Hozircha tasdiq kutayotgan chek yo&apos;q. O&apos;quvchi chek yuklashi
            bilan shu yerda paydo bo&apos;ladi.
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-text-muted">
              Chekni oching va kartangizga shu summa haqiqatan tushganini
              tekshiring — tasdiqlash o&apos;quvchi muddatini darhol uzaytiradi.
            </p>
            <ul className="divide-y divide-border">
              {pending.map((p) => {
                const amountLabel = formatAmountUzs(p.amount);
                const receiptUrl = `/api/student-payments/${p.id}/receipt`;
                return (
                  <li
                    key={p.id}
                    className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 md:flex-row md:items-start md:justify-between"
                  >
                    <div className="flex min-w-0 gap-4">
                      {/* Rasm bo'lsa — miniatyura, bosilsa to'liq ochiladi.
                          PDF'ni miniatyura qilib bo'lmaydi — havola. */}
                      <a
                        href={receiptUrl}
                        target="_blank"
                        rel="noopener"
                        className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-bg-subtle text-xs text-text-muted"
                      >
                        {p.receiptMime?.startsWith("image/") ? (
                          // eslint-disable-next-line @next/next/no-img-element -- maxfiy fayl, ruxsat bilan beriladi; next/image optimallashtiruvchisi orqali o'tkazilmaydi
                          <img
                            src={receiptUrl}
                            alt={`${p.studentName} cheki`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          "PDF chek"
                        )}
                      </a>
                      <div className="min-w-0 text-sm">
                        <p className="font-medium text-text">{p.studentName}</p>
                        <p className="text-text-muted">{p.groupName ?? "—"}</p>
                        <p className="mt-1">
                          <span className="font-mono text-text">{amountLabel}</span>{" "}
                          <span className="text-text-muted">· {p.months} oy</span>
                        </p>
                        <p className="text-text-muted">Yuborildi: {formatDate(p.createdAt)}</p>
                        <a href={receiptUrl} target="_blank" rel="noopener" className="text-brand underline">
                          Chekni ochish
                        </a>
                      </div>
                    </div>
                    <div className="md:shrink-0">
                      <PaymentReviewActions
                        endpoint={`/api/student-payments/${p.id}`}
                        payerName={p.studentName}
                        amountLabel={amountLabel}
                        nextEndsAtLabel={formatDate(p.nextPaidUntil)}
                        rejectNotice="Muddat uzaytirilmaydi, sabab o'quvchiga ko'rinadi."
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

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
