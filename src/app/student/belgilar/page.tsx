import Link from "next/link";
import { requireActiveStudent } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardNote } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { SignShapeMark } from "@/components/SignShapeMark";
import { SIGN_GROUPS, signCatalogProgress } from "@/data/yolBelgilari";

/**
 * Yo'l belgilari katalogi — guruhlar ro'yxati.
 *
 * ⚠️ DEMO: har guruhda 2-3 ta belgi kiritilgan. Ekran buni YASHIRMAYDI —
 * har qatorda "jami N tadan M tasi" yozilib turadi. Aks holda o'quvchi
 * ro'yxatni to'liq deb o'ylab, imtihonga chala tayyorlanardi.
 */
export default async function SignsPage() {
  await requireActiveStudent();
  const progress = signCatalogProgress();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Yo'l belgilari"
        description="Belgilar guruhlari — shakli, rangi va ma'nosi bilan."
      />

      <p className="flex items-start gap-2.5 rounded-md border border-warning/25 bg-warning-soft px-4 py-3 text-[12.5px] leading-relaxed text-text">
        <Icon name="alertTriangle" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <span>
          Katalog to&apos;ldirilmoqda: jami {progress.total} ta belgidan{" "}
          <strong>{progress.loaded} tasi</strong> kiritilgan. Guruhlar va
          ularning ma&apos;nosi to&apos;liq — belgilarning o&apos;zi
          bosqichma-bosqich qo&apos;shiladi.
        </span>
      </p>

      <Card>
        <CardHeader>
          <CardTitle icon="book">Guruhlar</CardTitle>
          <CardNote>{SIGN_GROUPS.length} ta guruh</CardNote>
        </CardHeader>

        <ul className="space-y-2.5">
          {SIGN_GROUPS.map((group) => (
            <li key={group.slug}>
              <Link
                href={`/student/belgilar/${group.slug}`}
                className="flex items-center gap-4 rounded-lg border border-border bg-bg px-4 py-3.5 transition-all hover:border-brand/40 hover:shadow-raised"
              >
                <SignShapeMark
                  shape={group.shape}
                  code={group.signs[0]?.code ?? "?"}
                  toneClass={group.toneClass}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[14.5px] font-bold text-text">
                    {group.title}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-text-muted">
                    {group.summary}
                  </span>
                  <span className="mt-1 block font-mono text-[11px] text-text-faint">
                    {group.totalCount} tadan {group.signs.length} tasi kiritilgan
                  </span>
                </span>
                <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-text-faint" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
