import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/Icon";

type CardProps = HTMLAttributes<HTMLDivElement>;

/**
 * Bazaviy konteyner. Hajm/ustuvorlikni chaqiruvchi joy belgilaydi
 * (className orqali) — bu yerda hech qanday standart hover-effekt yo'q.
 *
 * Soya ataylab juda yumshoq (`shadow-card`): u kartochkani "ko'tarish"
 * uchun emas, oq sirtni oq bo'lmagan fondan ajratish uchun. Ilgari bu ish
 * faqat 1px kulrang chiziq bilan bajarilardi va uzun sahifa bir varaq
 * katakli qog'ozga o'xshab qolardi.
 */
export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-bg p-5 shadow-card sm:p-6",
        className
      )}
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

export function CardTitle({
  className,
  icon,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { icon?: IconName }) {
  return (
    <h3
      className={cn(
        // Spetsifikatsiya: bo'lim sarlavhasi 16-19px, 700, display shrift.
        "flex items-center gap-2 font-display text-base font-bold text-text",
        className
      )}
      {...props}
    >
      {icon && (
        // Ikonka sarlavhadan bir pog'ona och: u yo'nalish beradi, lekin
        // sarlavhaning o'zidan ko'zga ko'proq tashlanmasligi kerak.
        <Icon name={icon} className="h-[18px] w-[18px] text-text-faint" />
      )}
      {children}
    </h3>
  );
}

/** Sarlavha ostidagi izoh — CardHeader ichida o'ng tomonda turadigan
 *  qisqa matn uchun. Ilgari har joyda `<span className="text-sm
 *  text-text-muted">` qo'lda yozilardi. */
export function CardNote({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("text-[13px] text-text-faint", className)} {...props} />;
}
