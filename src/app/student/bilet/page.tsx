import Link from "next/link";
import { requireActiveStudent } from "@/lib/auth";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Biletlar</h1>
        <p className="mt-1 text-sm text-text-muted">
          Har bir bilet — qat&apos;iy savollar to&apos;plami, har safar bir xil
          tartibda. Javob darhol tekshiriladi.
        </p>
      </div>

      {xato && (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{xato}</p>
      )}

      {tickets.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-base font-semibold text-text">Biletlar hali kiritilmagan</p>
          <p className="max-w-sm text-sm leading-relaxed text-text-muted">
            Bilet savollari bazaga kiritilgach shu yerda paydo bo&apos;ladi.
            Hozircha mashq va imtihon rejimlaridan foydalaning.
          </p>
          <Link href="/student/mashq">
            <Button type="button">Mashqni boshlash</Button>
          </Link>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Mavjud biletlar</CardTitle>
            <span className="text-sm text-text-muted">{tickets.length} ta bilet</span>
          </CardHeader>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {tickets.map((ticket) => (
              <Link
                key={ticket.number}
                href={`/student/test?bilet=${ticket.number}`}
                className="flex flex-col items-center gap-1 rounded-md border border-border px-3 py-4 text-center transition-colors hover:border-brand hover:bg-brand-soft/30"
              >
                <span className="text-base font-semibold text-text">
                  {ticket.number}-bilet
                </span>
                <span className="text-sm text-text-muted">
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
