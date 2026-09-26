import Link from "next/link";
import { requireActiveStudent } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardNote } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/Badge";
import { cn } from "@/lib/cn";
import { CHEAT_SHEETS } from "@/data/shpargalkalar";

/**
 * Shpargalkalar ro'yxati.
 *
 * Platformada shu paytgacha faqat SAVOLLAR bor edi — o'qib yodlaydigan
 * ma'lumotnoma yo'q edi. Bu bo'lim imtihonda ko'p uchraydigan raqamlarni
 * (tezlik, jarima ballari) bir joyga yig'adi.
 */
export default async function CheatSheetsPage() {
  await requireActiveStudent();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Shpargalkalar"
        description="Imtihonda ko'p uchraydigan, yodlash qiyin raqamlar — bir joyda."
      />

      <Card>
        <CardHeader>
          <CardTitle icon="book">Mavzular</CardTitle>
          <CardNote>{CHEAT_SHEETS.length} ta</CardNote>
        </CardHeader>

        <ul className="space-y-2.5">
          {CHEAT_SHEETS.map((sheet) => (
            <li key={sheet.slug}>
              <Link
                href={`/student/shpargalka/${sheet.slug}`}
                className="flex items-center gap-3.5 rounded-lg border border-border bg-bg px-4 py-3.5 transition-all hover:border-brand/40 hover:shadow-raised"
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    sheet.tone
                  )}
                >
                  <Icon name={sheet.icon} className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-[14.5px] font-bold text-text">
                      {sheet.title}
                    </span>
                    {/* Tekshirilmagan jadval ro'yxatda ham belgilanadi —
                        o'quvchi ochmasdan turib bilib tursin. */}
                    {!sheet.verified && <Badge variant="warning">Tekshirilmoqda</Badge>}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-text-muted">
                    {sheet.summary}
                  </span>
                </span>
                <Icon name="chevronRight" className="h-4 w-4 text-text-faint" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
