import Link from "next/link";
import { requireActiveStudent } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardNote } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { listTickets } from "@/services/tickets";

/**
 * Biletlar ro'yxati.
 *
 * O'quvchi imtihonga biletlar bo'yicha tayyorlanadi ("8-biletni
 * ishladim"), shuning uchun ular alohida bo'lim. Bilet — mashq rejimida:
 * javob darhol tekshiriladi va izohi ko'rsatiladi.
 *
 * Bazada bilet bo'lmasa bo'lim bo'sh emas, TUSHUNTIRADI: bilet savollari
 * import orqali kiritiladi, o'quvchi esa nega ro'yxat bo'shligini bilmay
 * qolmasin.
 */
export default async function StudentTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ xato?: string }>;
}) {
  await requireActiveStudent();
  const { xato } = await searchParams;
  const tickets = await listTickets();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Biletlar"
        description="Har bir bilet — qat'iy savollar to'plami, har safar bir xil tartibda. Javob darhol tekshiriladi."
      />

      {xato && (
        <p className="flex items-start gap-2 rounded-md border border-danger/25 bg-danger-soft px-4 py-3 text-[13px] text-danger">
          <Icon name="alertTriangle" className="mt-0.5 h-4 w-4" />
          {xato}
        </p>
      )}

      {tickets.length === 0 ? (
        <Card>
          <EmptyState
            icon="ticket"
            title="Biletlar hali kiritilmagan"
            description="Bilet savollari bazaga kiritilgach shu yerda paydo bo'ladi. Hozircha mashq va imtihon rejimlaridan foydalaning."
            action={{ href: "/student/mashq", label: "Mashqni boshlash" }}
          />
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle icon="ticket">Mavjud biletlar</CardTitle>
            <CardNote>{tickets.length} ta bilet</CardNote>
          </CardHeader>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {tickets.map((ticket) => (
              <Link
                key={ticket.number}
                href={`/student/test?bilet=${ticket.number}`}
                className="flex flex-col items-center gap-1 rounded-md border border-border bg-bg px-3 py-4 text-center shadow-card transition-all hover:border-brand/50 hover:shadow-raised"
              >
                <span className="font-display text-[17px] font-bold text-text">
                  {ticket.number}-bilet
                </span>
                <span className="text-[12px] text-text-muted">
                  {ticket.questionCount} ta savol
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
