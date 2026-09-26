import Link from "next/link";
import { requireActiveStudent } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardNote } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { FilterChips } from "@/components/JournalToolbar";
import { Badge } from "@/components/Badge";
import { listTickets, getTicketProgressForStudent } from "@/services/tickets";

/** URL'dagi filtr qiymatlari. */
type TicketFilter = "" | "yangi" | "xatolar";

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
  searchParams: Promise<{ xato?: string; filtr?: string }>;
}) {
  const user = await requireActiveStudent();
  const { xato, filtr } = await searchParams;
  const active: TicketFilter =
    filtr === "yangi" || filtr === "xatolar" ? filtr : "";

  const [allTickets, progress] = await Promise.all([
    listTickets(),
    getTicketProgressForStudent(user.id),
  ]);

  // "Yangi" — hali birorta savoliga javob berilmagan bilet.
  // "Xatolar" — ichida hali hal qilinmagan xato bor bilet.
  const newTickets = allTickets.filter(
    (t) => (progress.get(t.number)?.answeredCount ?? 0) === 0
  );
  const wrongTickets = allTickets.filter(
    (t) => (progress.get(t.number)?.wrongCount ?? 0) > 0
  );
  const tickets =
    active === "yangi" ? newTickets : active === "xatolar" ? wrongTickets : allTickets;

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

      {allTickets.length > 0 && (
        <FilterChips
          basePath="/student/bilet"
          active={active}
          options={[
            { value: "", label: "Barchasi", count: allTickets.length },
            { value: "yangi", label: "Yangi", count: newTickets.length },
            { value: "xatolar", label: "Xatolar", count: wrongTickets.length },
          ]}
        />
      )}

      {allTickets.length === 0 ? (
        <Card>
          <EmptyState
            icon="ticket"
            title="Biletlar hali kiritilmagan"
            description="Bilet savollari bazaga kiritilgach shu yerda paydo bo'ladi. Hozircha mashq va imtihon rejimlaridan foydalaning."
            action={{ href: "/student/mashq", label: "Mashqni boshlash" }}
          />
        </Card>
      ) : tickets.length === 0 ? (
        <Card>
          <EmptyState
            icon="check"
            title={
              active === "yangi"
                ? "Barcha biletlar ishlangan"
                : "Hal qilinmagan xato yo'q"
            }
            description={
              active === "yangi"
                ? "Har bir biletdan kamida bitta savolga javob bergansiz. Takrorlash uchun \"Barchasi\" ga qarang."
                : "Biletlardagi savollarning so'nggi javoblari to'g'ri. Yangi bilet ishlang yoki imtihon topshiring."
            }
            action={{ href: "/student/bilet", label: "Barcha biletlar" }}
          />
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle icon="ticket">
              {active === "yangi"
                ? "Ishlanmagan biletlar"
                : active === "xatolar"
                  ? "Xatosi bor biletlar"
                  : "Mavjud biletlar"}
            </CardTitle>
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
                {/* Holat plitkaning o'zida: filtrni almashtirmasdan ham
                    qaysi bilet ishlanmagani va qaysisida xato qolgani
                    ko'rinib tursin. */}
                {(() => {
                  const p = progress.get(ticket.number);
                  if (!p || p.answeredCount === 0) {
                    return (
                      <Badge variant="neutral">Yangi</Badge>
                    );
                  }
                  if (p.wrongCount > 0) {
                    return (
                      <Badge variant="danger">{p.wrongCount} ta xato</Badge>
                    );
                  }
                  return <Badge variant="success">Xatosiz</Badge>;
                })()}
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
