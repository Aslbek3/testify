import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Jadval o'rovchisi.
 *
 * **Telefonda (640px dan tor) jadval gorizontal surilmaydi** — har bir
 * qator kartochkaga aylanadi, ustun sarlavhasi esa katakning chap tomonida
 * `data-label` dan chiqadi. Uslublarning o'zi `globals.css` dagi
 * `.table-cards` blokida.
 *
 * Nega shu yo'l tanlandi (sahifalarda `hidden sm:block` + alohida
 * `MobileCardList` emas): jadvalni 17 ta fayl ishlatadi. Ikkinchi mobil
 * nusxa har birida qo'lda yozilganda ustun qo'shilganda ikki joyni
 * yangilash kerak bo'lardi va nusxalar vaqt o'tib bir-biridan ajralib
 * ketardi. Bu yerda esa tuzatish BITTA joyda bo'ladi.
 *
 * Katakka `data-label` qo'yilmasa yorliq ham chiqmaydi — qator o'qiladigan
 * holda qoladi, faqat kontekstsiz. Shuning uchun yangi jadvalda birinchi
 * ustundan boshqa hamma katakka `data-label` beriladi (birinchi ustun —
 * kartochkaning sarlavhasi, unga yorliq kerak emas).
 *
 * `mobile="scroll"` — istisno: agar ustun SARLAVHASINING o'zida bosiladigan
 * element bo'lsa (owner panelidagi saralash havolalari), kartochka rejimi
 * sarlavha qatorini yashirib, o'sha funksiyani yo'qotadi.
 */
export function Table({
  className,
  mobile = "cards",
  ...props
}: HTMLAttributes<HTMLTableElement> & { mobile?: "cards" | "scroll" }) {
  return (
    // `.table-scroll` — chekkalardagi surish ishorasi (izohi globals.css da).
    <div className="table-scroll overflow-x-auto">
      <table
        className={cn(
          "w-full min-w-[640px] border-collapse text-sm",
          mobile === "cards" && "table-cards",
          className
        )}
        {...props}
      />
    </div>
  );
}

export function TableHead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      // Sarlavha qatori engil fon bilan ajratiladi. Ilgari u oddiy qator edi
      // va uzun jadvalda birinchi ma'lumot qatoridan farq qilmasdi.
      className={cn("border-b border-border bg-surface-2/60", className)}
      {...props}
    />
  );
}

export function TableBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

export function TableRow({
  className,
  clickable,
  ...props
}: HTMLAttributes<HTMLTableRowElement> & { clickable?: boolean }) {
  return (
    <tr
      className={cn(
        // Ichki ajratgich asosiy chegaradan och: 30 qatorli ro'yxatda to'q
        // chiziqlar katakli qog'oz taassurotini berardi. Telefonda aynan
        // shu chiziq kartochkalarni bir-biridan ajratadi.
        "border-b border-border-subtle transition-colors last:border-0",
        clickable && "cursor-pointer hover:bg-brand-soft/50",
        className
      )}
      {...props}
    />
  );
}

export function TableHeaderCell({
  className,
  align = "left",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" }) {
  return (
    <th
      // ATAYLAB katta harflarda emas — CLAUDE.md dizayn qoidasi ALL CAPS
      // yorliqlarni taqiqlaydi. Ajratish fon va rang bilan qilinadi.
      className={cn(
        "px-4 py-2.5 text-[13px] font-semibold text-text-muted",
        align === "right" ? "text-right" : "text-left",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  align = "left",
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" }) {
  return (
    <td
      className={cn(
        "px-4 py-3 text-text",
        align === "right" ? "text-right font-mono tabular-nums" : "text-left",
        className
      )}
      {...props}
    />
  );
}
