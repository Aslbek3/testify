import { notFound } from "next/navigation";
import { requireActiveStudent } from "@/lib/auth";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Icon } from "@/components/Icon";
import { getCheatSheet } from "@/data/shpargalkalar";

/**
 * Bitta shpargalka — jadval ko'rinishida.
 *
 * Shakl ataylab shunday: QIYMAT chapda katta va ajratilgan, tavsif
 * o'ngda. Oddiy ikki ustunli jadvalda ko'z har safar qatorni boshidan
 * o'qishga majbur bo'ladi; bu yerda esa kerakli raqam bir qarashda
 * topiladi — shpargalkaning butun ma'nosi shu.
 *
 * `generateStaticParams` ATAYLAB yo'q: sahifa sessiya talab qiladi
 * (`requireActiveStudent`), ya'ni baribir har so'rovda serverda
 * chiziladi. U bo'lganda mavjud bo'lmagan slug `notFound()` ga
 * yetib bormasdan 200 qaytarardi.
 */
export default async function CheatSheetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireActiveStudent();
  const { slug } = await params;

  const sheet = getCheatSheet(slug);
  if (!sheet) notFound();

  return (
    <div className="space-y-5">
      <Breadcrumb
        items={[
          { label: "Bosh sahifa", href: "/student" },
          { label: "Shpargalkalar", href: "/student/shpargalka" },
          { label: sheet.title },
        ]}
      />

      <PageHeader title={sheet.title} description={sheet.summary} />

      {/* Tekshirilmagan raqam o'quvchini imtihonda yiqitishi mumkin —
          shuning uchun ogohlantirish yashirilmaydi va jadvalning
          TEPASIDA turadi. */}
      {!sheet.verified && (
        <p className="flex items-start gap-2.5 rounded-md border border-warning/25 bg-warning-soft px-4 py-3 text-[12.5px] leading-relaxed text-text">
          <Icon name="alertTriangle" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span>
            Bu jadval hali Yo&apos;l harakati qoidalarining rasmiy matni bilan
            solishtirilmagan. Imtihonga tayyorgarlikda undan foydalaning, lekin
            bahsli raqamni ustozingizdan so&apos;rab tasdiqlang.
          </span>
        </p>
      )}

      {sheet.sections.map((section) => (
        <Card key={section.title} className="p-0 sm:p-0">
          <h2 className="border-b border-border px-5 py-3.5 font-display text-[14.5px] font-bold text-text sm:px-6">
            {section.title}
          </h2>

          <ul>
            {section.rows.map((row, index) => (
              <li
                key={index}
                className="flex items-start gap-4 border-b border-border px-5 py-3.5 last:border-b-0 sm:px-6"
              >
                {/* Qiymat ustuni qat'iy kenglikda — qatorlar bo'ylab
                    raqamlar bir chiziqda tursin, ko'z ularni ro'yxat
                    sifatida o'qiy olsin. */}
                <span className="flex w-[92px] shrink-0 items-baseline gap-1">
                  <span className="font-display text-[22px] font-bold leading-none tabular-nums text-brand">
                    {row.value}
                  </span>
                  {row.unit && (
                    <span className="text-[11px] font-semibold text-text-muted">
                      {row.unit}
                    </span>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] leading-snug text-text">
                    {row.label}
                  </span>
                  {row.note && (
                    <span className="mt-1 block text-[11.5px] leading-snug text-text-faint">
                      {row.note}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ))}

      {sheet.source && (
        <p className="text-[11.5px] text-text-faint">Manba: {sheet.source}</p>
      )}
    </div>
  );
}
