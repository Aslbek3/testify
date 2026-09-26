import { notFound } from "next/navigation";
import { requireActiveStudent } from "@/lib/auth";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Icon } from "@/components/Icon";
import { SignShapeMark } from "@/components/SignShapeMark";
import { getSignGroup } from "@/data/yolBelgilari";

/**
 * Bitta guruhdagi belgilar.
 *
 * ⚠️ DEMO: ro'yxat to'liq emas va buni sahifa ochiq aytadi.
 *
 * `generateStaticParams` yo'q — sahifa sessiya talab qiladi, ya'ni
 * baribir serverda chiziladi (`shpargalka/[slug]` bilan bir xil sabab).
 */
export default async function SignGroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireActiveStudent();
  const { slug } = await params;

  const group = getSignGroup(slug);
  if (!group) notFound();

  const missing = group.totalCount - group.signs.length;

  return (
    <div className="space-y-5">
      <Breadcrumb
        items={[
          { label: "Bosh sahifa", href: "/student" },
          { label: "Yo'l belgilari", href: "/student/belgilar" },
          { label: group.title },
        ]}
      />

      <PageHeader title={group.title} description={group.summary} />

      <div className="grid gap-3.5 sm:grid-cols-2">
        {group.signs.map((sign) => (
          <Card key={sign.code} className="flex items-start gap-4">
            <SignShapeMark
              shape={group.shape}
              code={sign.code}
              toneClass={group.toneClass}
            />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[14px] font-bold leading-snug text-text">
                {sign.name}
              </p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-text-muted">
                {sign.meaning}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {missing > 0 && (
        <p className="flex items-start gap-2.5 rounded-md border border-border bg-surface-2/60 px-4 py-3 text-[12.5px] leading-relaxed text-text-muted">
          <Icon name="inbox" className="mt-0.5 h-4 w-4 shrink-0 text-text-faint" />
          <span>
            Bu guruhda yana <strong className="text-text">{missing} ta</strong>{" "}
            belgi bor — ular hali kiritilmagan. Hozircha shakl va rang
            bo&apos;yicha guruhni tanib olishni mashq qiling, to&apos;liq
            ro&apos;yxat keyinroq qo&apos;shiladi.
          </span>
        </p>
      )}
    </div>
  );
}
