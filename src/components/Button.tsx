import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary";

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand/90",
  secondary:
    "border border-border bg-bg text-text hover:bg-bg-subtle",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        "rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50",
        VARIANT_STYLES[variant],
        className
      )}
      {...props}
    />
  );
}
