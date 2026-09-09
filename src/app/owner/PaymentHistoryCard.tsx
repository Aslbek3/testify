import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Badge } from "@/components/Badge";
import {
  PLAN_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_VARIANT,
} from "@/lib/labels";
import { formatDate, formatAmountUzs } from "@/lib/format";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/Table";
import type { PaymentRow } from "@/services/payments";

/**
 * To'lov tarixi — owner panelida DOIM turadi, hatto bitta ham to'lov
 * bo'lmasa ham.
 *
 * Nega bo'sh holatda ham chiziladi (yuqoridagi "tasdiq kutayotgan"
 * kartochkasidan farqli): u yerda kartochka yo'qolsa ish yo'qligini
 * bildiradi, bu yerda esa yo'qolsa — funksiyaning O'ZI yo'qdek
 * ko'rinadi. Owner "to'lovni qayerda tasdiqlayman?" deb qidirib topa
 * olmasdi. Endi bo'lim doim ko'rinadi va bo'sh holatda to'lov qayerdan
 * kelishini tushuntiradi.
 */
export function PaymentHistoryCard({ payments }: { payments: PaymentRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>To&apos;lovlar tarixi</CardTitle>
        {payments.length > 0 && (
          <span className="text-sm text-text-muted">
            oxirgi {payments.length} ta
          </span>
        )}
      </CardHeader>

      {payments.length === 0 ? (
        <div className="text-sm text-text-muted">
          <p>Hali birorta to&apos;lov xabari yo&apos;q.</p>
          <p className="mt-1">
            To&apos;lov xabarini avtomaktab direktori o&apos;z panelidan
            yuboradi — u bank orqali to&apos;laydi va shu haqda xabar
            qoldiradi. Xabar kelishi bilan shu sahifaning eng tepasida
            tasdiqlash uchun alohida kartochka paydo bo&apos;ladi.
          </p>
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Sana</TableHeaderCell>
              <TableHeaderCell>Avtomaktab</TableHeaderCell>
              <TableHeaderCell align="right">Summa</TableHeaderCell>
              <TableHeaderCell align="right">Muddat</TableHeaderCell>
              <TableHeaderCell>Tarif</TableHeaderCell>
              <TableHeaderCell>Holat</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{formatDate(payment.createdAt)}</TableCell>
                <TableCell className="font-medium">
                  {payment.organizationName}
                </TableCell>
                <TableCell align="right">
                  {formatAmountUzs(payment.amount)}
                </TableCell>
                <TableCell align="right">{payment.months} oy</TableCell>
                <TableCell>{PLAN_LABEL[payment.plan]}</TableCell>
                <TableCell>
                  <Badge variant={PAYMENT_STATUS_VARIANT[payment.status]}>
                    {PAYMENT_STATUS_LABEL[payment.status]}
                  </Badge>
                  {/* Rad etish sababi alohida ustun emas: u qolgan barcha
                      qatorlarda bo'sh turardi. */}
                  {payment.status === "REJECTED" && payment.reviewNote && (
                    <span className="mt-1 block text-xs text-text-muted">
                      {payment.reviewNote}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
