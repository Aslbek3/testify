import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Har bir sahifaning yuqori bloki: kontekst → sarlavha → bir jumlalik izoh
 * → asosiy amal.
 *
 * Ilgari har sahifa buni o'zicha yozardi: kimdir `text-xl`, kimdir
 * `text-2xl`, izoh matni esa ba'zan uch qator paragraf edi. Endi tuzilish
 * bitta joyda va hamma sahifada bir xil.
 *
 * `eyebrow` oddiy harflarda yoziladi. Dizayn spetsifikatsiyasining matni
 * qisqa kontekst yorlig'i uchun katta harfga ruxsat bergan edi, lekin
 * keyingi maketlarda ("Xush kelibsiz") u oddiy harfda chiqqan — va
 * `CLAUDE.md` ning "ALL CAPS yorliqlardan qoch" qoidasi ham shuni talab
 * qiladi. Ajratish rang va qalinlik bilan qilinadi.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  /** Rol yoki bo'lim nomi — "Direktor paneli", "O'quvchi paneli". */
  eyebrow?: string;
  title: string;
  /** Bir jumla. Uzun tushuntirish jadval tepasiga emas, kontentga yoziladi. */
  description?: string;
  /** O'ngdagi tugmalar, filtr yoki sana boshqaruvi. */
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-x-6 gap-y-4",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[13px] font-bold text-brand">{eyebrow}</p>
        )}
        <h1
          className={cn(
            // Spetsifikatsiya: 30-34px desktop, 26-30px mobil, -0.04em.
            "font-display text-[26px] font-bold leading-[1.1] tracking-[-0.04em] text-text sm:text-[30px]",
            eyebrow && "mt-1.5"
          )}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-text-muted">
            {description}
          </p>
        )}
      </div>

      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
