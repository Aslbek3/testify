import { requireRole } from "@/lib/auth";
import { formatDate, formatCardNumber } from "@/lib/format";
import type { StudentAccess } from "@/lib/studentAccess";
import {
  getPaymentInstructionsForStudent,
  getStudentAccessForUser,
  listPaymentsForStudent,
} from "@/services/studentPayments";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { StudentPaymentsTable } from "@/components/StudentPaymentsTable";
import { StudentPaymentForm } from "./StudentPaymentForm";

/** Holat kartochkasining matni — kirish holatining o'zi `lib/studentAccess.ts` da. */
function AccessSummary({ access }: { access: StudentAccess }) {
  switch (access.kind) {
    case "free":
      return (
        <p className="text-sm text-text-muted">
          Avtomaktabingiz to&apos;lovni tizim orqali qabul qilmaydi — to&apos;lov
          bo&apos;yicha avtomaktabning o&apos;ziga murojaat qiling.
        </p>
      );
    case "trial":
      return (
        <p className="text-sm">
          <Badge variant="warning">Bepul sinov</Badge>{" "}
          <span className="ml-1">
            yana {access.daysLeft} kun — {formatDate(access.endsAt)} gacha.
          </span>
        </p>
      );
    case "paid":
      return (
        <p className="text-sm">
          <Badge variant="success">To&apos;langan</Badge>{" "}
          <span className="ml-1">{formatDate(access.paidUntil)} gacha.</span>
        </p>
      );
    case "grace":
      return (
        <p className="text-sm font-medium text-danger">
          Muddat {formatDate(access.endedAt)} da tugagan. {access.daysLeft} kundan
          keyin testlar yopiladi.
        </p>
      );
    case "blocked":
      return (
        <p className="text-sm font-medium text-danger">
          Testlar yopiq — muddat {formatDate(access.endedAt)} da tugagan. To&apos;lov
          tasdiqlanishi bilan qayta ochiladi.
        </p>
      );
  }
}

export default async function StudentPaymentPage() {
  const user = await requireRole("STUDENT");
  const [access, instructions, payments] = await Promise.all([
    getStudentAccessForUser(user.id),
    getPaymentInstructionsForStudent(user.id),
    listPaymentsForStudent(user.id),
  ]);

  const canPay =
    instructions?.enabled &&
    instructions.cardNumber &&
    instructions.cardHolder &&
    instructions.priceOneMonth &&
    instructions.priceSixMonths;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-text">To&apos;lov</h1>

      <Card>
        <CardHeader>
          <CardTitle>Holat</CardTitle>
        </CardHeader>
        <AccessSummary access={access} />
      </Card>

      {canPay && (
        <Card>
          <CardHeader>
            <CardTitle>To&apos;lov qilish</CardTitle>
          </CardHeader>

          {instructions.hasPending ? (
            <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
              Chekingiz direktorga yuborilgan — tasdiqlanishini kuting. U ko&apos;rib
              chiqilmaguncha yangi chek yubora olmaysiz.
            </p>
          ) : (
            <StudentPaymentForm
              cardNumber={formatCardNumber(instructions.cardNumber!)}
              cardHolder={instructions.cardHolder!}
              prices={{ 1: instructions.priceOneMonth!, 6: instructions.priceSixMonths! }}
            />
          )}
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>To&apos;lovlarim</CardTitle>
        </CardHeader>
        {payments.length === 0 ? (
          <p className="text-sm text-text-muted">Hali to&apos;lov yo&apos;q.</p>
        ) : (
          <StudentPaymentsTable payments={payments} showStudent={false} />
        )}
      </Card>
    </div>
  );
}
