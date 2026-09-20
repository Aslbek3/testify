import Link from "next/link";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/Icon";

/**
 * Jurnal jadvali ustidagi asboblar qatori: filtr tabletkalari va qidiruv.
 *
 * Ikkalasi ham SERVER komponenti va URL orqali ishlaydi — filtr oddiy
 * havola, qidiruv esa `method="get"` formasi. Sabablari:
 *
 * - holat URL'da qoladi, ya'ni filtrlangan ro'yxatni ustozga yuborish
 *   yoki xatcho'pga qo'shish mumkin;
 * - brauzerning "orqaga" tugmasi filtrni qaytaradi;
 * - JavaScript yuklanmasa ham ishlaydi;
 * - klient holatini boshqarish kerak emas — bu sahifa baribir server
 *   tomonda chiziladi va ma'lumotni serverdan oladi.
 */
export type FilterOption = {
  /** URL'dagi qiymat. Bo'sh satr — "Hammasi" (parametr umuman qo'yilmaydi). */
  value: string;
  label: string;
  /** Yonidagi son. `undefined` — ko'rsatilmaydi. */
  count?: number;
};

export function FilterChips({
  options,
  active,
  basePath,
  paramName = "filtr",
  /** Filtr almashganda saqlanadigan qolgan parametrlar (masalan qidiruv). */
  keepParams,
}: {
  options: FilterOption[];
  active: string;
  basePath: string;
  paramName?: string;
  keepParams?: Record<string, string | undefined>;
}) {
  function hrefFor(value: string): string {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(keepParams ?? {})) {
      if (val) params.set(key, val);
    }
    if (value) params.set(paramName, value);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = option.value === active;
        return (
          <Link
            key={option.value || "hammasi"}
            href={hrefFor(option.value)}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12px] font-semibold transition-colors pointer-fine:py-1.5",
              isActive
                ? "border-brand bg-brand text-white"
                : "border-border bg-bg text-text-muted hover:bg-surface-2 hover:text-text"
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={cn("tabular-nums", !isActive && "text-text-faint")}>
                {option.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export function JournalSearch({
  basePath,
  defaultValue,
  placeholder,
  /** Qidirilganda saqlanadigan filtr — aks holda qidiruv uni yo'qotardi. */
  keepParams,
  paramName = "q",
}: {
  basePath: string;
  defaultValue?: string;
  placeholder: string;
  keepParams?: Record<string, string | undefined>;
  paramName?: string;
}) {
  return (
    <form action={basePath} method="get" className="relative sm:ml-auto sm:w-64">
      {/* Filtrni yashirin maydon bilan olib o'tamiz: forma yuborilganda
          faqat o'z maydonlarini jo'natadi, URL'dagi qolgani yo'qoladi. */}
      {Object.entries(keepParams ?? {}).map(([key, value]) =>
        value ? <input key={key} type="hidden" name={key} value={value} /> : null
      )}
      <label htmlFor="journal-search" className="sr-only">
        {placeholder}
      </label>
      <Icon
        name="search"
        className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-text-faint"
      />
      <input
        id="journal-search"
        type="search"
        name={paramName}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-bg py-2.5 pl-10 pr-3 text-sm text-text transition-colors placeholder:text-text-faint focus-visible:border-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15"
      />
    </form>
  );
}
