import { Card, CardHeader, CardTitle } from "@/components/Card";
import { PLAN_LABEL } from "@/lib/labels";
import { formatDate, formatAmountUzs } from "@/lib/format";
import type { PaymentRow } from "@/services/payments";

import { PaymentReviewActions } from "./PaymentReviewActions";

export type PendingPaymentReview = {
  payment: PaymentRow;
  /**
   * Tasdiqlansa obuna shu sanagacha uzayadi.
   *
   * Sana SERVERDA `extendSubscription()` bilan hisoblanadi — ya'ni
   * tasdiqlash paytida bazaga yoziladigan qiymat bilan bir xil mantiq.
   * Klientda qayta hisoblansa, ikkita nusxa paydo bo'lardi va biri
   * o'zgarganda owner ekranda boshqa sanani ko'rib, boshqasini
   * tasdiqlagan bo'lardi.
   */
  nextEndsAt: Date;
};

/** Bo'sh qatorlar uchun bir xil belgi — jadvaldagi bilan bir xil. */
const EMPTY = "—";

/**
 * "Tasdiq kutayotgan to'lovlar" — owner panelining eng tepasidagi kartochka.
 *
 * Nega eng tepada (statistika plitkalaridan ham oldin): mijoz to'lovni
 * amalga oshirgan, lekin owner tasdiqlamaguncha obunasi uzaymaydi va
 * imtiyoz muddati tugashi bilan butun avtomaktab tizimdan chiqib qoladi.
 * Ya'ni bu owner uchun kechiktirib bo'lmaydigan yagona ish — statistika
 * esa kutib turishi mumkin.
 *
 * Kutayotgan to'lov bo'lmasa kartochka UMUMAN chizilmaydi: doim turadigan
 * bo'sh "hech narsa yo'q" kartochkasi har kuni ko'zga tashlanaveradi va
 * bir necha kundan keyin owner uni butunlay payqamay qo'yadi.
 */
export function PendingPaymentsCard({ items }: { items: PendingPaymentReview[] }) {
  if (items.length === 0) return null;

  return (
    <Card className="border-brand/50">
      <CardHeader>
        <CardTitle>Tasdiq kutayotgan to&apos;lovlar</CardTitle>
        <span className="text-sm text-text-muted">
          {items.length} ta xabar
        </span>
      </CardHeader>

      <p className="mb-4 text-sm text-text-muted">
        To&apos;lovni bank ko&apos;chirmasi bilan solishtiring: tasdiqlash
        obunani darhol uzaytiradi.
      </p>

      <ul className="divide-y divide-border">
        {items.map(({ payment, nextEndsAt }) => {
          const amountLabel = formatAmountUzs(payment.amount);
          return (
            <li
              key={payment.id}
              className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 md:flex-row md:items-start md:justify-between"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-medium text-text">
                    {payment.organizationName}
                  </span>
                  <span className="font-mono text-lg font-semibold tabular-nums text-text">
                    {amountLabel}
                  </span>
                </div>

                <p className="text-sm text-text-muted">
                  {payment.months} oy · {PLAN_LABEL[payment.plan]} tarifi
                </p>

                {/* Owner uchun asosiy solishtirish maydoni — to'lov raqami.
                    Shuning uchun u alohida qatorda va `font-mono` bilan:
                    ko'chirmadagi raqam bilan belgima-belgi taqqoslanadi. */}
                <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  <div className="flex gap-2">
                    <dt className="text-text-muted">To&apos;lov raqami:</dt>
                    <dd className="min-w-0 break-all font-mono text-text">
                      {payment.reference ?? EMPTY}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-text-muted">Yuborgan:</dt>
                    <dd className="min-w-0 text-text">
                      {payment.submittedByName} · {formatDate(payment.createdAt)}
                    </dd>
                  </div>
                  {/* Izoh ixtiyoriy — bo'sh bo'lsa qator umuman
                      chizilmaydi, "Izoh: —" hech qanday ma'lumot bermaydi. */}
                  {payment.note && (
                    <div className="flex gap-2 sm:col-span-2">
                      <dt className="text-text-muted">Izoh:</dt>
                      <dd className="min-w-0 text-text">{payment.note}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Amallar bloki desktopda o'ng chekkada, lekin ichi chapga
                  tekislangan qoladi: tugma va uning ostidagi "Tasdiqlansa:"
                  qatori bir chiziqdan boshlansa, ular bitta butun bo'lib
                  o'qiladi. */}
              <div className="md:shrink-0">
                <PaymentReviewActions
                  paymentId={payment.id}
                  organizationName={payment.organizationName}
                  amountLabel={amountLabel}
                  nextEndsAtLabel={formatDate(nextEndsAt)}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
