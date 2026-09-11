import { formatDate, formatAmountUzs } from "@/lib/format";
import {
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_VARIANT,
  STUDENT_PAYMENT_METHOD_LABEL,
} from "@/lib/labels";
import type { StudentPaymentRow } from "@/services/studentPayments";
import { Badge } from "@/components/Badge";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/Table";

/**
 * O'quvchi to'lovlari jadvali — o'quvchining o'z sahifasida ham,
 * direktor tarixida ham. Farqi faqat "O'quvchi" ustunida: o'quvchiga
 * u keraksiz (hammasi o'ziniki).
 */
export function StudentPaymentsTable({
  payments,
  showStudent,
}: {
  payments: StudentPaymentRow[];
  showStudent: boolean;
}) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Sana</TableHeaderCell>
          {showStudent && <TableHeaderCell>O&apos;quvchi</TableHeaderCell>}
          <TableHeaderCell align="right">Summa</TableHeaderCell>
          <TableHeaderCell align="right">Muddat</TableHeaderCell>
          <TableHeaderCell>Usul</TableHeaderCell>
          <TableHeaderCell>Holat</TableHeaderCell>
          <TableHeaderCell>Chek</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {payments.map((p) => (
          <TableRow key={p.id}>
            <TableCell>{formatDate(p.createdAt)}</TableCell>
            {showStudent && <TableCell className="font-medium">{p.studentName}</TableCell>}
            <TableCell align="right">{formatAmountUzs(p.amount)}</TableCell>
            <TableCell align="right">{p.months} oy</TableCell>
            <TableCell>{STUDENT_PAYMENT_METHOD_LABEL[p.method]}</TableCell>
            <TableCell>
              <Badge variant={PAYMENT_STATUS_VARIANT[p.status]}>
                {PAYMENT_STATUS_LABEL[p.status]}
              </Badge>
              {/* Rad etish sababi alohida ustun emas: u qolgan barcha
                  qatorlarda bo'sh turardi. */}
              {p.status === "REJECTED" && p.reviewNote && (
                <span className="mt-1 block text-xs text-text-muted">
                  Sabab: {p.reviewNote}
                </span>
              )}
            </TableCell>
            <TableCell>
              {p.hasReceipt ? (
                <a
                  href={`/api/student-payments/${p.id}/receipt`}
                  target="_blank"
                  rel="noopener"
                  className="text-brand underline"
                >
                  Ko&apos;rish
                </a>
              ) : (
                "—"
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
