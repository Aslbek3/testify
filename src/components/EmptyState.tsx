import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/Button";
import { Icon, type IconName } from "@/components/Icon";

/**
 * Bo'sh holat — ro'yxatda hali hech narsa yo'qligini bildiradi.
 *
 * Qoida (dizayn yo'nalishi "f"): har bir bo'sh holatda KEYINGI QADAM
 * tugmasi bo'lishi kerak. Ilgari bu joylarda faqat kulrang jumla turardi
 * ("Hozircha guruhlar yo'q.") — foydalanuvchi nima qilishini o'zi topishi
 * kerak edi, bo'sh sahifa esa mahsulot buzilgandek taassurot berardi.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: IconName;
  title: string;
  /** Nima uchun bo'sh va qanday to'ldiriladi — bir-ikki jumla. */
  description?: string;
  /** Tayyor havola yoki o'z komponenti (masalan modal ochadigan tugma). */
  action?: { href: string; label: string } | ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 px-4 py-10 text-center",
        className
      )}
    >
      {/* Ikonka juda och: u bo'shlikni to'ldiradi, lekin diqqatni tugmadan
          tortib olmasligi kerak. */}
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-text-faint">
        <Icon name={icon} className="h-6 w-6" />
      </span>

      <div className="space-y-1">
        <p className="font-display text-[15px] font-bold text-text">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-text-muted">
            {description}
          </p>
        )}
      </div>

      {action &&
        (typeof action === "object" && action !== null && "href" in action ? (
          <Link href={(action as { href: string }).href} className="mt-1 inline-block">
            <Button type="button" variant="secondary">
              {(action as { label: string }).label}
            </Button>
          </Link>
        ) : (
          <div className="mt-1">{action as ReactNode}</div>
        ))}
    </div>
  );
}
