import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost-dark";

// Har bir variant o'z padding/spacing'ini to'liq o'zi belgilaydi (bazaviy
// klassda emas) — shunda className orqali boshqa kontekst uchun (masalan
// sidebar) qayta yozishda Tailwind klasslari to'qnashib qolmaydi.
// `py-3 pointer-fine:py-2` — mobilda tugma balandligi ~44px, desktopda avvalgi 36px.
// 44px barmoq uchun tavsiya etiladigan eng kam o'lcham; desktopda sichqoncha
// aniqroq va zichroq tartib yaxshiroq ko'rinadi.
const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: "px-4 py-3 pointer-fine:py-2 bg-brand text-white hover:bg-brand/90",
  secondary:
    "px-4 py-3 pointer-fine:py-2 border border-border bg-bg text-text hover:bg-bg-subtle",
  "ghost-dark":
    "w-full px-3 py-3 pointer-fine:py-2 text-left text-white/70 hover:bg-white/10 hover:text-white",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        // font-sans — raqamli (font-mono) ustunlar ichida (masalan "Amallar"
        // ustunidagi tugmalar) ham shrift meros olib qolmasin.
        "rounded-md font-sans text-sm font-medium disabled:opacity-50",
        VARIANT_STYLES[variant],
        className
      )}
      {...props}
    />
  );
}
