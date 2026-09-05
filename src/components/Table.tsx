import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Mobil ekranda gorizontal scroll bo'lishi uchun o'rovchi. */
export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
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
