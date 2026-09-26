import Link from "next/link";
import { Icon } from "@/components/Icon";

/**
 * Sahifa tepasidagi yo'l ko'rsatkich.
 *
 * Jurnal tizimida shart: ustozlar jurnalidan guruhga, guruhdan o'quvchiga
 * o'tiladi — uch qadam ichkarida foydalanuvchi qayerdaligini va qanday
 * qaytishni bilishi kerak. Brauzerning "orqaga" tugmasi bitta qadam
 * qaytaradi, bu esa istalgan darajaga.
 *
 * Oxirgi band havola EMAS — u hozirgi sahifaning o'zi.
 */
export type Crumb = { label: string; href?: string };

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Yo'l" className="mb-3">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && (
                <Icon
                  name="chevronRight"
                  className="h-3.5 w-3.5 text-text-faint"
                />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="font-semibold text-text-muted transition-colors hover:text-brand"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="font-semibold text-text-faint"
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
