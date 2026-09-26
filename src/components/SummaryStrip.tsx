import { cn } from "@/lib/cn";

/**
 * Jurnal tepasidagi xulosa qatori — 3-4 ta raqam.
 *
 * `StatTile` dan farqi ataylab: bu yerda ikonka ham, rangli doira ham yo'q.
 * Jurnalning asosiy mazmuni — jadval; tepadagi raqamlar unga kontekst
 * beradi, diqqatni o'ziga tortmasligi kerak. `StatTile` esa panelda
 * ko'rsatkichning O'ZI asosiy bo'lgan joyda ishlatiladi.
 */
export type SummaryItem = {
  label: string;
  value: string | number;
  /** Raqam yonidagi mayda izoh — "o'rtacha 15", "124 tadan". */
  hint?: string;
};

export function SummaryStrip({
  items,
  className,
}: {
  items: SummaryItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-4",
        // Uchta band bo'lsa ham qator to'la ko'rinsin.
        items.length === 3 && "sm:grid-cols-3",
        className
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-md border border-border bg-bg px-4 py-3 shadow-card"
        >
          <p className="text-[11px] font-semibold text-text-muted">{item.label}</p>
          <p className="mt-0.5 flex items-baseline gap-1.5">
            <span className="font-display text-[22px] font-bold tracking-[-0.04em] tabular-nums text-text">
              {item.value}
            </span>
            {item.hint && (
              <span className="text-[12px] font-semibold text-text-faint">
                {item.hint}
              </span>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
