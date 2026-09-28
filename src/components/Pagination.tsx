import Link from "next/link";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/cn";

/**
 * Sahifalash boshqaruvi.
 *
 * SERVER komponenti va URL orqali ishlaydi — `JournalToolbar` dagi
 * filtrlar bilan bir xil sabab: holat manzilda qoladi (ro'yxatni
 * yuborish va xatcho'pga qo'shish mumkin), brauzerning "orqaga"
 * tugmasi ishlaydi, JavaScript yuklanmasa ham ochiladi.
 *
 * Bitta sahifa bo'lsa umuman chizilmaydi — bo'sh boshqaruv ekranni
 * chalg'itadi.
 */
export function Pagination({
  page,
  pageCount,
  total,
  basePath,
  /** Sahifa almashganda saqlanadigan boshqa parametrlar (qidiruv, filtr). */
  keepParams,
  paramName = "sahifa",
  /** "12 ta savol" — birlik nomi. */
  itemLabel = "yozuv",
}: {
  page: number;
  pageCount: number;
  total: number;
  basePath: string;
  keepParams?: Record<string, string | undefined>;
  paramName?: string;
  itemLabel?: string;
}) {
  if (pageCount <= 1) return null;

  function hrefFor(target: number): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(keepParams ?? {})) {
      if (value) params.set(key, value);
    }
    // Birinchi sahifada parametr qo'yilmaydi — manzil toza qoladi.
    if (target > 1) params.set(paramName, String(target));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  // Ko'rinadigan raqamlar: hozirgisidan ikki qadam narigacha, boshi va
  // oxiri doim. O'nlab sahifa bo'lganda hammasini chizish qatorni
  // o'qib bo'lmaydigan qilardi.
  const numbers: (number | "…")[] = [];
  for (let i = 1; i <= pageCount; i += 1) {
    const near = Math.abs(i - page) <= 1;
    const edge = i === 1 || i === pageCount;
    if (near || edge) {
      numbers.push(i);
    } else if (numbers[numbers.length - 1] !== "…") {
      numbers.push("…");
    }
  }

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 pt-1"
      aria-label="Sahifalar"
    >
      <p className="text-[12px] text-text-muted">
        Jami {total} ta {itemLabel} · {page}/{pageCount}-sahifa
      </p>

      <div className="flex items-center gap-1">
        <PageLink
          href={hrefFor(page - 1)}
          disabled={page === 1}
          label="Oldingi sahifa"
        >
          <Icon name="chevronLeft" className="h-4 w-4" />
        </PageLink>

        {numbers.map((n, index) =>
          n === "…" ? (
            <span key={`gap-${index}`} className="px-1 text-[12px] text-text-faint">
              …
            </span>
          ) : (
            <Link
              key={n}
              href={hrefFor(n)}
              aria-current={n === page ? "page" : undefined}
              className={cn(
                "min-w-[34px] rounded-md px-2 py-1.5 text-center font-mono text-[12.5px] font-semibold transition-colors",
                n === page
                  ? "bg-brand text-white"
                  : "text-text-muted hover:bg-surface-2 hover:text-text"
              )}
            >
              {n}
            </Link>
          )
        )}

        <PageLink
          href={hrefFor(page + 1)}
          disabled={page === pageCount}
          label="Keyingi sahifa"
        >
          <Icon name="chevronRight" className="h-4 w-4" />
        </PageLink>
      </div>
    </nav>
  );
}

/**
 * O'q tugmasi. O'chiq holatda `<span>` chiziladi, `<a>` emas: ishlamaydigan
 * havola klaviatura bilan yurganda ham fokus oladi va foydalanuvchini
 * chalg'itadi.
 */
function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const className =
    "flex h-8 w-8 items-center justify-center rounded-md transition-colors";
  if (disabled) {
    return (
      <span aria-hidden="true" className={cn(className, "text-text-faint opacity-40")}>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(className, "text-text-muted hover:bg-surface-2 hover:text-text")}
    >
      {children}
    </Link>
  );
}
