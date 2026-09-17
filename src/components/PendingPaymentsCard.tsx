import { formatDate, formatAmountUzs } from "@/lib/format";
import type { PendingStudentPaymentReview } from "@/services/studentPayments";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { PaymentReviewActions } from "@/components/PaymentReviewActions";

/**
 * Tasdiq kutayotgan cheklar — direktor va qabulxona sahifalarida AYNI
 * kartochka.
 *
 * `canReview` — "Qabulxona pul bilan ishlaydi" kaliti o'chirilgan
 * holat uchun: xodim cheklarni ko'radi (kim to'laganini bilishi kerak),
 * lekin tasdiqlash/rad etish tugmalari chizilmaydi. Haqiqiy cheklov
 * baribir serverda (`canReviewStudentPayments`) — bu faqat ekran.
 */
export function PendingPaymentsCard({
  pending,
  canReview,
}: {
  pending: PendingStudentPaymentReview[];
  canReview: boolean;
}) {
  return (
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
            {canReview
              ? "Chekni oching va avtomaktab kartasiga shu summa haqiqatan tushganini tekshiring — tasdiqlash o'quvchi muddatini darhol uzaytiradi."
              : "Cheklarni ko'rishingiz mumkin, lekin tasdiqlashni direktor qiladi."}
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
                  {canReview && (
                    <div className="md:shrink-0">
                      <PaymentReviewActions
                        endpoint={`/api/student-payments/${p.id}`}
                        payerName={p.studentName}
                        amountLabel={amountLabel}
                        nextEndsAtLabel={formatDate(p.nextPaidUntil)}
                        rejectNotice="Muddat uzaytirilmaydi, sabab o'quvchiga ko'rinadi."
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}
