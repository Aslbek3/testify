"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8s-2.4 4.5-6.5 4.5S1.5 8 1.5 8Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="1.9" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6.4 3.7A6.9 6.9 0 0 1 8 3.5c4.1 0 6.5 4.5 6.5 4.5a12 12 0 0 1-2 2.6M4.2 4.9A12 12 0 0 0 1.5 8S3.9 12.5 8 12.5c1 0 1.9-.3 2.7-.7"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
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
 * ishlatiladi.
 */
export function PasswordField({
  label,
  id,
  className,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id?: string;
  /** Maydon ostidagi qo'shimcha izoh (masalan "Kamida 8 belgi"). */
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="text-sm font-medium text-text">
        {label}
      </label>

      <div className="relative">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          aria-describedby={hintId}
          className={cn(
            // O'ngda tugma turadi — matn uning ostiga kirib ketmasligi uchun
            // qo'shimcha joy qoldiriladi.
            "w-full rounded-md border border-border bg-bg py-2 pl-3 pr-11 text-sm text-text",
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
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-text-muted hover:text-text pointer-fine:w-9"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      {hint && (
        <p id={hintId} className="text-xs leading-relaxed text-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
