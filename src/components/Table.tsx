import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Mobil ekranda gorizontal scroll bo'lishi uchun o'rovchi.
 *
 * Chekkalardagi soya — surish mumkinligining vizual ishorasi. Usiz jadval
 * kesilgandek ko'rinardi va foydalanuvchi o'ngda yana ustunlar borligini
 * bilmasdi.
 *
 * `background-attachment: local` hiylasi ataylab tanlandi: soya FAQAT
 * surish mumkin bo'lganda ko'rinadi va surilgan tomonga qarab o'zi
 * yo'qoladi. Oddiy `sm:hidden` bilan qo'yilgan gradient noto'g'ri bo'lardi —
 * jadval eng kami 640px, ya'ni u sidebar ochilgan planshetda ham suriladi,
 * lekin keng desktopda surilmaydi. Bu yechim JS'siz o'zi moslashadi.
 */
export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div
      className="overflow-x-auto"
      style={{
        backgroundImage: [
          // Kartochka foni rangidagi "niqob" — u kontent bilan birga suriladi
          // (local) va chekkaga yetganda soyani berkitadi.
          "linear-gradient(to right, var(--color-bg), transparent)",
          "linear-gradient(to left, var(--color-bg), transparent)",
          // Soyaning o'zi — konteynerga mahkam (scroll), joyida qoladi.
          "linear-gradient(to right, rgb(0 0 0 / 0.12), transparent)",
          "linear-gradient(to left, rgb(0 0 0 / 0.12), transparent)",
        ].join(","),
        backgroundPosition: "left center, right center, left center, right center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "28px 100%, 28px 100%, 10px 100%, 10px 100%",
        backgroundAttachment: "local, local, scroll, scroll",
      }}
    >
      <table
        className={cn("w-full min-w-[640px] border-collapse text-sm", className)}
        {...props}
      />
    </div>
  );
}

export function TableHead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />;
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
        "border-b border-border last:border-0",
        clickable && "cursor-pointer hover:bg-bg-subtle",
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
      className={cn(
        "px-3 py-2 font-medium text-text-muted",
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
        "px-3 py-3 text-text",
        align === "right" ? "text-right font-mono tabular-nums" : "text-left",
        className
      )}
      {...props}
    />
  );
}
