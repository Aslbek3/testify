import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement>;

/**
 * Bazaviy konteyner. Hajm/ustuvorlikni chaqiruvchi joy belgilaydi
 * (className orqali) — bu yerda hech qanday standart hover-effekt yo'q.
 */
export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-bg p-6", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // `flex-wrap` mobil uchun: sarlavha yonidagi izoh matni (masalan
        // "29 ta yakunlangan urinish · Qatorni bosing...") 390px ekranga
        // sig'maydi va bitta qatorda qolsa butun sahifani kengaytirib
        // yuboradi. O'ralganda u o'z qatoriga tushadi, desktopda esa
        // avvalgidek yonma-yon qoladi.
        "mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1",
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base font-semibold text-text", className)}
      {...props}
    />
  );
}
