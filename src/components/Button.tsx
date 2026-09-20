import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/Icon";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "ghost-dark"
  | "outline-dark";

export type ButtonSize = "sm" | "md" | "lg";

// Har bir variant o'z rangini to'liq o'zi belgilaydi. Padding esa `SIZE_STYLES`
// dan keladi — ilgari ikkisi aralashib ketgan edi va `className` orqali
// qayta yozishda Tailwind klasslari to'qnashardi.
const VARIANT_STYLES: Record<ButtonVariant, string> = {
  // Soya neytral emas, brend rangida: turkuaz yuza ustidagi kulrang soya
  // kir ko'rinadi. `active:` — bosilganda tugma bir piksel pastga tushadi,
  // ya'ni bosilgani ko'rinadi (ilgari hech qanday javob yo'q edi).
  primary:
    "bg-brand text-white shadow-brand hover:bg-brand-hover active:translate-y-px",
  secondary:
    "border border-border bg-bg text-text hover:border-text-faint/40 hover:bg-bg-subtle active:translate-y-px",
  ghost: "text-text-muted hover:bg-bg-subtle hover:text-text",
  // Spetsifikatsiya bo'yicha to'ldirilgan qizil emas, OCHIQ fon + qizil
  // matn: o'chirish tugmasi ekrandagi eng kuchli element bo'lib qolmasligi
  // kerak (dizayn qoidasi "e": qizil — muammo rangi, bezak emas).
  danger: "bg-danger-soft text-danger hover:brightness-95 active:translate-y-px",
  "ghost-dark": "w-full text-white/70 hover:bg-white/10 hover:text-white",
  // To'q fondagi ekranlar uchun (test ekrani) — u yerda oq `secondary`
  // tugma juda kuchli chiqadi va savoldan diqqatni tortib oladi.
  "outline-dark":
    "border border-white/20 text-white/80 hover:border-white/35 hover:bg-white/10 hover:text-white active:translate-y-px",
};

// `py-*` mobilda kattaroq: telefonda tugma balandligi ~44px (barmoq uchun
// eng kam tavsiya etiladigan o'lcham), desktopda (`pointer-fine`) zichroq.
const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "gap-1.5 px-3 py-2.5 text-[13px] pointer-fine:py-1.5",
  md: "gap-2 px-4 py-3 text-sm pointer-fine:py-2",
  lg: "gap-2 px-5 py-3.5 text-[15px] pointer-fine:py-3",
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconEnd,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Matndan oldingi ikonka. */
  icon?: IconName;
  /** Matndan keyingi ikonka — odatda `arrowRight` (davom etish ma'nosida). */
  iconEnd?: IconName;
}) {
  const iconSize = size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]";

  return (
    <button
      className={cn(
        // font-sans — raqamli (font-mono) ustunlar ichida (masalan "Amallar"
        // ustunidagi tugmalar) ham shrift meros olib qolmasin.
        "inline-flex items-center rounded-md font-sans font-semibold transition-all duration-150",
        "disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none",
        // Sidebar bandi chapga tekislanadi — u menyu qatoriday ko'rinishi
        // kerak. Shart bu yerda: `justify-start` ni variant klassiga qo'shish
        // ishonchsiz, chunki Tailwind klasslar ustunligini atribut tartibi
        // emas, o'z ichki tartibi hal qiladi.
        variant === "ghost-dark" ? "justify-start" : "justify-center",
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className
      )}
      {...props}
    >
      {icon && <Icon name={icon} className={iconSize} />}
      {children}
      {iconEnd && <Icon name={iconEnd} className={iconSize} />}
    </button>
  );
}
