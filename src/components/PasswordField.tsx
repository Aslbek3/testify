"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import {
  INPUT_CLASS,
  INPUT_WITH_ICON_CLASS,
  FieldLabel,
  FieldIcon,
} from "@/components/Field";

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9.6 5.7A10.5 10.5 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a18 18 0 0 1-3.1 3.9M6.4 7.4A18 18 0 0 0 2 12s3.6 6.5 10 6.5c1.5 0 2.9-.4 4.1-1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Parol maydoni — yozilayotgan parolni ko'rsatish/yashirish tugmasi bilan.
 *
 * Nega kerak: parol ko'rinmasa foydalanuvchi xato yozganini faqat "parol
 * noto'g'ri" javobidan keyin biladi. Ayniqsa ustoz o'quvchiga yangi parol
 * belgilayotganda muhim — u parolni og'zaki aytib berishi kerak, ya'ni
 * yozganini ko'rishi shart.
 *
 * `Field` dan alohida turadi, chunki bu yerda holat bor va komponent
 * klientda ishlashi kerak; `Field` esa server komponentlarida ham
 * ishlatiladi. Maydonning ko'rinishi esa umumiy (`INPUT_CLASS`) — ikkisi
 * bir xil formada turganda farq qilmasligi kerak.
 */
export function PasswordField({
  label,
  id,
  className,
  hint,
  icon,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id?: string;
  /** Maydon ostidagi qo'shimcha izoh (masalan "Kamida 8 belgi"). */
  hint?: string;
  /** Chap ikonka — kirish sahifasida qulf belgisi turadi. */
  icon?: "lock";
}) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>

      <div className="relative">
        {icon && <FieldIcon name={icon} />}
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          aria-describedby={hintId}
          className={cn(
            INPUT_CLASS,
            icon && INPUT_WITH_ICON_CLASS,
            // O'ngda tugma turadi — matn uning ostiga kirib ketmasligi uchun
            // qo'shimcha joy qoldiriladi.
            "pr-11",
            className
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          // Ekran o'quvchisi uchun holat tugma nomida aytiladi; `aria-pressed`
          // esa uni almashtirgich sifatida e'lon qiladi.
          aria-label={visible ? "Parolni yashirish" : "Parolni ko'rsatish"}
          aria-pressed={visible}
          // Barmoq uchun 44px, sichqoncha uchun ixchamroq — loyihadagi
          // qolgan tugmalar bilan bir xil qoida.
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-text-faint transition-colors hover:text-text pointer-fine:w-9"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      {hint && (
        <p id={hintId} className="text-xs leading-relaxed text-text-faint">
          {hint}
        </p>
      )}
    </div>
  );
}
