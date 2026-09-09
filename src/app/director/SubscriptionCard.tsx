import Link from "next/link";
import type {
  getSubscriptionSummary,
  PaymentRow,
} from "@/services/payments";
import { getSubscriptionState, type SubscriptionState } from "@/lib/subscription";
import {
  PLAN_LABEL,
  ORG_STATUS_LABEL,
  ORG_STATUS_VARIANT,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_VARIANT,
} from "@/lib/labels";
import { formatDate, formatAmountUzs } from "@/lib/format";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Badge, type BadgeVariant } from "@/components/Badge";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/Table";
import { PaymentModal } from "./PaymentModal";

/** Servis qaytaradigan shakl bir joyda — bu yerda qayta yozilmaydi. */
export type SubscriptionSummary = Awaited<
  ReturnType<typeof getSubscriptionSummary>
>;

const STATE_BADGE: Record<
  SubscriptionState["kind"],
  { label: string; variant: BadgeVariant }
> = {
  active: { label: "Faol", variant: "success" },
  // "Muddati tugagan" — imtiyoz muddati ham aynan shu: obuna allaqachon
  // tugagan, faqat kirish hali yopilmagan.
  grace: { label: "Muddati tugagan", variant: "danger" },
  blocked: { label: "To'xtatilgan", variant: "danger" },
};

/**
 * Imtiyoz muddati ogohlantirishi — direktorning HAR BIR sahifasida
 * ko'rinadi (`director/layout.tsx`).
 *
 * Faqat direktorga: ustoz va o'quvchi to'lovni hal qila olmaydi, ularga
 * "kirish yopiladi" deb yozish faqat tashvish beradi. Shu sabab banner
 * `AppShell` ichida emas, aynan direktor layout'ida turadi.
 *
 * Kartochkaning o'zi bu matnni takrorlamaydi — u faqat qisqa xulosa
 * qatorini ko'rsatadi, aks holda `/director` sahifasida bir xil
 * ogohlantirish ikki marta chiqardi.
 */
export function SubscriptionWarningBanner({
  daysLeft,
  hasPendingPayment,
  href,
}: {
  daysLeft: number;
  hasPendingPayment: boolean;
  /** Berilsa — obuna bo'limiga havola qo'shiladi (kartochkaning o'zida
      turganda kerak emas). */
  href?: string;
}) {
  return (
    <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
      <p className="font-medium">
        Obuna muddati tugagan. Kirish yana {daysLeft} kundan keyin yopiladi.
      </p>
      <p className="mt-1">
        {hasPendingPayment
          ? "To'lov haqidagi xabaringiz yuborilgan — tasdiqlanishi bilan obuna uzayadi."
          : "To'lovni amalga oshiring va shu haqda xabar bering, aks holda tashkilotingizdagi hamma — ustozlar va o'quvchilar ham — tizimga kira olmay qoladi."}
      </p>
      {href && (
        <Link href={href} className="mt-2 inline-block font-medium underline">
          Obuna bo&apos;limiga o&apos;tish
        </Link>
      )}
    </div>
  );
}

/** Obuna holati va "to'lov haqida xabar berish" tugmasi. */
export function SubscriptionCard({
  summary,
}: {
  summary: SubscriptionSummary;
}) {
  // Holat bu yerda hisoblanmaydi — bitta manba (`getSubscriptionState`)
  // orqali aniqlanadi, sessiyani bekor qiladigan tekshiruv bilan aynan
  // bir xil bo'lishi uchun.
  const state = getSubscriptionState({
    status: summary.status,
    subscriptionEndsAt: summary.subscriptionEndsAt,
  });

  // Sinov muddati "faol"ning bir turi — uni oddiy to'langan obunadan
  // ajratib ko'rsatish kerak, aks holda direktor to'lash kerakligini
  // bilmay qoladi.
  const badge =
    state.kind === "active" && summary.status === "TRIAL"
      ? { label: ORG_STATUS_LABEL.TRIAL, variant: ORG_STATUS_VARIANT.TRIAL }
      : STATE_BADGE[state.kind];

  const endsAt = summary.subscriptionEndsAt;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Obuna</CardTitle>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </CardHeader>

      <div className="space-y-4">
        <p className="text-sm">
          <span className="text-text-muted">Tarif: </span>
          <span className="font-medium">{PLAN_LABEL[summary.plan]}</span>
        </p>

        {state.kind === "active" && (
          <p className="text-sm text-text-muted">
            {endsAt
              ? `Obuna ${formatDate(endsAt)} gacha amal qiladi.`
              : "Obuna muddati belgilanmagan."}
          </p>
        )}

        {/* Batafsil ogohlantirish sahifa yuqorisidagi bannerda (layout) —
            bu yerda faqat sana bilan qisqa xulosa. */}
        {state.kind === "grace" && (
          <p className="text-sm font-medium text-danger">
            {endsAt
              ? `Obuna muddati ${formatDate(endsAt)} da tugagan — kirish yana ${state.daysLeft} kundan keyin yopiladi.`
              : `Obuna muddati tugagan — kirish yana ${state.daysLeft} kundan keyin yopiladi.`}
          </p>
        )}

        {/* Bu ko'rinish amalda deyarli chiqmaydi: obuna yopilgan bo'lsa
            sessiya tekshiruvi direktorni sahifaga umuman kiritmaydi.
            Shunga qaramay qoldirilgan — holat sahifa ochiq turganda
            o'zgarishi mumkin va bo'sh kartochka ko'rsatishdan ko'ra
            sababini yozib qo'yish yaxshiroq. */}
        {state.kind === "blocked" && (
          <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            <p className="font-medium">Obuna to&apos;xtatilgan.</p>
            <p className="mt-1">
              {endsAt
                ? `Obuna muddati ${formatDate(endsAt)} da tugagan.`
                : "Tashkilotingiz uchun kirish yopilgan."}{" "}
              To&apos;lov tasdiqlanishi bilan kirish qayta ochiladi.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <PaymentModal
            currentPlan={summary.plan}
            hasPendingPayment={summary.hasPendingPayment}
          />
          {summary.hasPendingPayment && (
            <span className="text-sm text-text-muted">
              To&apos;lov haqidagi xabaringiz tasdiq kutmoqda — u ko&apos;rib
              chiqilmaguncha yangisini yubora olmaysiz.
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

/** To'lov xabarlari tarixi. */
export function PaymentHistoryCard({ payments }: { payments: PaymentRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>To&apos;lovlar tarixi</CardTitle>
        <span className="text-sm text-text-muted">
          {payments.length} ta xabar
        </span>
      </CardHeader>

      {payments.length === 0 ? (
        <p className="text-sm text-text-muted">
          Hozircha to&apos;lov haqida xabar yuborilmagan.
        </p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Sana</TableHeaderCell>
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
                <TableCell align="right">
                  {formatAmountUzs(payment.amount)}
                </TableCell>
                <TableCell align="right">{payment.months} oy</TableCell>
                <TableCell>{PLAN_LABEL[payment.plan]}</TableCell>
                <TableCell>
                  <Badge variant={PAYMENT_STATUS_VARIANT[payment.status]}>
                    {PAYMENT_STATUS_LABEL[payment.status]}
                  </Badge>
                  {/* Rad etish sababi alohida ustun emas, holat ostida:
                      u faqat rad etilgan qatorlarda bo'ladi, ustun esa
                      qolgan hamma qatorda bo'sh turardi. Sababsiz direktor
                      nima qilish kerakligini bilmaydi. */}
                  {payment.reviewNote && (
                    <p className="mt-1 text-sm text-danger">
                      {payment.reviewNote}
                    </p>
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
