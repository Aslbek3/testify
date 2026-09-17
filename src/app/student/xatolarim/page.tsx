import Link from "next/link";
import { requireActiveStudent } from "@/lib/auth";
import { Button } from "@/components/Button";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { StatTile } from "@/components/StatTile";
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
        "rounded-full border px-3 py-2 text-sm font-medium transition-colors pointer-fine:py-1.5",
        active
          ? "border-brand bg-brand-soft text-brand"
          : "border-border bg-bg text-text-muted hover:bg-bg-subtle"
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Xatolarim</h1>
          {/* ⚠️ Ma'lumot manbai ATAYLAB ochiq yozilgan. Panel statistikasi
              faqat IMTIHON urinishlari bo'yicha hisoblanadi, bu ro'yxat esa
              mashqni ham qo'shadi — manba yozilmasa o'quvchi ikki ekrandagi
              raqamlarni solishtirib, birini xato deb o'ylaydi. */}
          <p className="mt-1 text-sm text-text-muted">
            Barcha yakunlangan urinishlar bo&apos;yicha. Javobsiz qoldirilgan
            savollar bu ro&apos;yxatga kirmaydi.
          </p>
        </div>
        {stillWrong.length > 0 && (
          <Link href={testHref}>
            <Button type="button">Xatolardan test</Button>
          </Link>
        )}
      </div>

      {xato && (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{xato}</p>
      )}

      {!mistakes.hasFinishedAttempt ? (
        // Bo'sh holatning BIRINCHI sababi: hali test yechilmagan. O'quvchiga
        // "xatoyingiz yo'q" deyish yolg'on bo'lardi — hali o'lchanmagan.
        <Card className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-base font-semibold text-text">Hali test yechilmagan</p>
          <p className="max-w-sm text-sm leading-relaxed text-text-muted">
            Mashq yoki imtihonni yakunlaganingizdan so&apos;ng xato qilgan
            savollaringiz shu yerda to&apos;planadi va ular ustida alohida
            ishlay olasiz.
          </p>
          <Link href="/student/mashq">
            <Button type="button">Mashqni boshlash</Button>
          </Link>
        </Card>
      ) : mistakes.items.length === 0 ? (
        // IKKINCHI sabab: test yechilgan, lekin birorta xato yo'q.
        <Card className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-base font-semibold text-text">Xato yo&apos;q</p>
          <p className="max-w-sm text-sm leading-relaxed text-text-muted">
            Yakunlangan urinishlaringizda birorta xato yo&apos;q. Ajoyib natija —
            yangi test yechib, bilimingizni tekshirib turing.
          </p>
          <Link href="/student/imtihon">
            <Button type="button">Imtihon topshirish</Button>
          </Link>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Qisqacha xulosa</CardTitle>
              {(filters.sources.length > 0 || filters.topicIds.length > 0) && (
                <span className="text-sm text-text-muted">Tanlangan filtr bo&apos;yicha</span>
              )}
            </CardHeader>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <StatTile
                label="Hali xato"
                value={stillWrong.length}
                sub="oxirgi javob noto'g'ri"
              />
              <StatTile
                label="Tuzatilgan"
                value={visible.length - stillWrong.length}
                sub="oxirgi javob to'g'ri"
              />
              <StatTile
                label="Jami xato"
                value={visible.reduce((sum, item) => sum + item.wrongCount, 0)}
                sub="noto'g'ri javoblar soni"
              />
            </div>
          </Card>

          <Card className="space-y-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-text">Qayerda xato qilgansiz</p>
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
                <p className="text-sm font-medium text-text">Mavzu</p>
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
                className="inline-block text-sm text-brand hover:underline"
              >
                Filtrni tozalash
              </Link>
            )}
          </Card>

          <Card>
            {visible.length === 0 ? (
              <p className="text-sm text-text-muted">
                Tanlangan filtrda xato topilmadi. Boshqa bandni tanlang yoki
                filtrni tozalang.
              </p>
            ) : (
              <MistakesList items={visible} />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
