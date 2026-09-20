import Link from "next/link";
import { requireActiveStudent } from "@/lib/auth";
import { Button } from "@/components/Button";
import { Card, CardHeader, CardTitle, CardNote } from "@/components/Card";
import { StatTile } from "@/components/StatTile";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/cn";
import {
  MISTAKE_SOURCES,
  MISTAKE_SOURCE_LABEL,
  filterMistakes,
  parseMistakeSources,
  parseTopicIds,
  type MistakeSource,
} from "@/lib/mistakeFilters";
import { getStudentMistakes } from "@/services/mistakes";
import { finalizeExpiredAttempts } from "@/services/attempts";
import { MistakesList } from "./MistakesList";

/**
 * Filtrlar URL'da turadi (`?manba=EXAM,ASSIGNMENT&mavzu=<id>`).
 *
 * Nega klientda emas: "Xatolardan test" tugmasi aynan shu manzilni oladi va
 * server o'sha filtrni QAYTA qo'llab test tuzadi. Filtr faqat brauzer
 * xotirasida bo'lganda, ekranda 7 ta savol ko'rinib, test 9 ta savoldan
 * tuzilib qolishi mumkin edi.
 */
function buildHref(params: { sources: MistakeSource[]; topicIds: string[] }): string {
  const query = new URLSearchParams();
  if (params.sources.length > 0) query.set("manba", params.sources.join(","));
  if (params.topicIds.length > 0) query.set("mavzu", params.topicIds.join(","));
  const suffix = query.toString();
  return suffix ? `/student/xatolarim?${suffix}` : "/student/xatolarim";
}

/** Tanlangan bandni ro'yxatdan olib tashlaydi, tanlanmaganini qo'shadi. */
function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-2 text-[12px] font-semibold transition-colors pointer-fine:py-1.5",
        active
          ? "border-brand bg-brand text-white"
          : "border-border bg-bg text-text-muted hover:bg-surface-2 hover:text-text"
      )}
    >
      {children}
    </Link>
  );
}

export default async function StudentMistakesPage({
  searchParams,
}: {
  searchParams: Promise<{ manba?: string; mavzu?: string; xato?: string }>;
}) {
  const user = await requireActiveStudent();
  const { manba, mavzu, xato } = await searchParams;

  // Panel bilan bir xil "yalqov" yakunlash: yorliq yopilib tashlab ketilgan
  // imtihonni server tomonda hech kim yopmaydi, u esa `finishedAt: null`
  // bo'lgani uchun bu ro'yxatga tushmaydi. Ma'lumotni O'QISHDAN OLDIN
  // turishi shart.
  await finalizeExpiredAttempts(user.id);

  const mistakes = await getStudentMistakes(user.id);
  const filters = { sources: parseMistakeSources(manba), topicIds: parseTopicIds(mavzu) };
  const visible = filterMistakes(mistakes.items, filters);

  // Filtrda faqat ma'lumotda HAQIQATAN uchraydigan bandlar ko'rsatiladi:
  // hech qachon maraton ishlamagan o'quvchiga "Maraton (0)" tugmasi
  // keraksiz savol tug'diradi.
  const usedSources = MISTAKE_SOURCES.filter((source) =>
    mistakes.items.some((item) => item.sources.includes(source))
  );
  const usedTopics = [
    ...new Map(mistakes.items.map((item) => [item.topicId, item.topicName])).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1]));

  const stillWrong = visible.filter((item) => !item.isFixed);
  const testHref =
    `/student/test?xatolar=1` +
    (filters.sources.length > 0 ? `&manba=${filters.sources.join(",")}` : "") +
    (filters.topicIds.length > 0 ? `&mavzu=${filters.topicIds.join(",")}` : "");

  return (
    <div className="space-y-5">
      {/* ⚠️ Izohdagi "barcha yakunlangan urinishlar" ATAYLAB yozilgan.
          Panel statistikasi faqat IMTIHON urinishlari bo'yicha hisoblanadi,
          bu ro'yxat esa mashqni ham qo'shadi — manba aytilmasa o'quvchi ikki
          ekrandagi raqamlarni solishtirib, birini xato deb o'ylaydi. */}
      <PageHeader
        title="Xatolarim"
        description="Barcha yakunlangan urinishlar bo'yicha. Javobsiz qoldirilgan savollar bu ro'yxatga kirmaydi."
        actions={
          stillWrong.length > 0 ? (
            <Link href={testHref}>
              <Button type="button" icon="play">
                Xatolardan test
              </Button>
            </Link>
          ) : undefined
        }
      />

      {xato && (
        <p className="flex items-start gap-2 rounded-md border border-danger/25 bg-danger-soft px-4 py-3 text-[13px] text-danger">
          <Icon name="alertTriangle" className="mt-0.5 h-4 w-4" />
          {xato}
        </p>
      )}

      {!mistakes.hasFinishedAttempt ? (
        // Bo'sh holatning BIRINCHI sababi: hali test yechilmagan. O'quvchiga
        // "xatoyingiz yo'q" deyish yolg'on bo'lardi — hali o'lchanmagan.
        <Card>
          <EmptyState
            icon="inbox"
            title="Hali test yechilmagan"
            description="Mashq yoki imtihonni yakunlaganingizdan so'ng xato qilgan savollaringiz shu yerda to'planadi va ular ustida alohida ishlay olasiz."
            action={{ href: "/student/mashq", label: "Mashqni boshlash" }}
          />
        </Card>
      ) : mistakes.items.length === 0 ? (
        // IKKINCHI sabab: test yechilgan, lekin birorta xato yo'q.
        <Card>
          <EmptyState
            icon="check"
            title="Xato yo'q"
            description="Yakunlangan urinishlaringizda birorta xato yo'q. Ajoyib natija — yangi test yechib, bilimingizni tekshirib turing."
            action={{ href: "/student/imtihon", label: "Imtihon topshirish" }}
          />
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle icon="chart">Qisqacha xulosa</CardTitle>
              {(filters.sources.length > 0 || filters.topicIds.length > 0) && (
                <CardNote>Tanlangan filtr bo&apos;yicha</CardNote>
              )}
            </CardHeader>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
              <StatTile
                icon="alertTriangle"
                tone="warning"
                label="Hali xato"
                value={stillWrong.length}
                sub="oxirgi javob noto'g'ri"
              />
              <StatTile
                icon="check"
                tone="brand"
                label="Tuzatilgan"
                value={visible.length - stillWrong.length}
                sub="oxirgi javob to'g'ri"
              />
              <StatTile
                icon="chart"
                tone="info"
                label="Jami xato"
                value={visible.reduce((sum, item) => sum + item.wrongCount, 0)}
                sub="noto'g'ri javoblar soni"
              />
            </div>
          </Card>

          <Card className="space-y-3">
            <div className="space-y-2">
              <p className="text-[13px] font-semibold text-text">Qayerda xato qilgansiz</p>
              <div className="flex flex-wrap gap-2">
                {usedSources.map((source) => {
                  const active = filters.sources.includes(source);
                  return (
                    <FilterChip
                      key={source}
                      active={active}
                      href={buildHref({
                        sources: toggle(filters.sources, source),
                        topicIds: filters.topicIds,
                      })}
                    >
                      {MISTAKE_SOURCE_LABEL[source]}
                    </FilterChip>
                  );
                })}
              </div>
            </div>

            {usedTopics.length > 1 && (
              <div className="space-y-2">
                <p className="text-[13px] font-semibold text-text">Mavzu</p>
                <div className="flex flex-wrap gap-2">
                  {usedTopics.map(([topicId, topicName]) => (
                    <FilterChip
                      key={topicId}
                      active={filters.topicIds.includes(topicId)}
                      href={buildHref({
                        sources: filters.sources,
                        topicIds: toggle(filters.topicIds, topicId),
                      })}
                    >
                      {topicName}
                    </FilterChip>
                  ))}
                </div>
              </div>
            )}

            {(filters.sources.length > 0 || filters.topicIds.length > 0) && (
              <Link
                href="/student/xatolarim"
                className="inline-block text-[12.5px] font-bold text-brand hover:underline"
              >
                Filtrni tozalash
              </Link>
            )}
          </Card>

          <Card>
            {visible.length === 0 ? (
              <EmptyState
                icon="search"
                title="Tanlangan filtrda xato topilmadi"
                description="Boshqa bandni tanlang yoki filtrni tozalang."
                action={{ href: "/student/xatolarim", label: "Filtrni tozalash" }}
              />
            ) : (
              <MistakesList items={visible} />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
