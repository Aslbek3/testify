import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/Icon";

/**
 * Barcha kiritish maydonlarining umumiy uslubi.
 *
 * Alohida chiqarilgan, chunki uni `Field`, `SelectField` va `PasswordField`
 * ishlatadi — uchta joyda takrorlansa, biri o'zgartirilib ikkitasi
 * unutilganda bitta formada uch xil maydon turardi.
 *
 * Fokusda tashqi `outline` o'rniga halqa (`ring`): maydonning o'z chegarasi
 * brend rangiga o'tadi va atrofida yumshoq halqa paydo bo'ladi — bu
 * to'rtburchak konturdan aniqroq ko'rinadi.
 */
export const INPUT_CLASS = [
  "w-full rounded-md border border-border bg-bg px-3 py-2.5 text-sm text-text",
  "transition-colors placeholder:text-text-faint",
  "focus-visible:border-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15",
  "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-text-faint",
].join(" ");

/** Xato holatidagi maydon — chegara va halqa qizil. */
export const INPUT_ERROR_CLASS =
  "border-danger focus-visible:border-danger focus-visible:ring-danger/15";

/** Chapda ikonka turganda matn uning ustiga chiqmasligi uchun. */
export const INPUT_WITH_ICON_CLASS = "pl-11";

/**
 * Maydon ichidagi chap ikonka. Maydonni o'rab turgan `relative` blok
 * chaqiruvchida bo'ladi — shu sababli alohida komponent: `Field` ham,
 * `PasswordField` ham bir xil joylashuvni ishlatadi.
 */
export function FieldIcon({ name }: { name: IconName }) {
  return (
    <Icon
      name={name}
      className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-text-faint"
    />
  );
}

export function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="text-[13px] font-semibold text-text">
      {children}
    </label>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
  /** Maydon ostidagi izoh — nima kutilayotganini oldindan aytadi. */
  hint?: string;
  /** Xato matni. Berilsa maydon qizil bo'ladi va izoh o'rniga shu chiqadi. */
  error?: string;
  /** Maydon ichidagi chap ikonka (masalan email uchun konvert). */
  icon?: IconName;
};

export function Field({ label, id, hint, error, icon, className, ...props }: FieldProps) {
  const noteId = error || hint ? `${id}-note` : undefined;

  return (
    <div className="space-y-1.5">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        {icon && <FieldIcon name={icon} />}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={noteId}
          className={cn(
            INPUT_CLASS,
            icon && INPUT_WITH_ICON_CLASS,
            error && INPUT_ERROR_CLASS,
            className
          )}
          {...props}
        />
      </div>
      {(error || hint) && (
        <p
          id={noteId}
          className={cn("text-xs leading-relaxed", error ? "text-danger" : "text-text-faint")}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  id: string;
  hint?: string;
  children: ReactNode;
};

export function SelectField({
  label,
  id,
  hint,
  className,
  children,
  ...props
}: SelectFieldProps) {
  const noteId = hint ? `${id}-note` : undefined;

  return (
    <div className="space-y-1.5">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <select
          id={id}
          aria-describedby={noteId}
          // `appearance-none` + o'z strelkamiz: tizim strelkasi har
          // brauzerda boshqacha va qorong'i rejimda oq quticha bo'lib
          // chiqib qolardi. O'ngda strelka uchun joy qoldiriladi.
          className={cn(INPUT_CLASS, "appearance-none pr-9", className)}
          {...props}
        >
          {children}
        </select>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
      {hint && (
        <p id={noteId} className="text-xs leading-relaxed text-text-faint">
          {hint}
        </p>
      )}
    </div>
  );
}
