import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
};

export function Field({ label, id, className, ...props }: FieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      <input
        id={id}
        className={cn(
          "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text",
          className
        )}
        {...props}
      />
    </div>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  id: string;
  children: ReactNode;
};

export function SelectField({ label, id, children, ...props }: SelectFieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      <select
        id={id}
        className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
