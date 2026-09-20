"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/Icon";

/**
 * Animatsiya faqat shu yerda — foydalanuvchi ochgan harakatga javoban.
 * Boshqa hech qanday kartochka/komponentga hover-animatsiya qo'shilmaydi.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Sarlavha ostidagi bir jumlalik izoh — nima bo'layotganini aytadi. */
  description?: string;
  /** `lg` — ko'p maydonli formalar uchun (masalan savol qo'shish). */
  size?: "md" | "lg";
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Fokusni faqat modal HAQIQATAN ochilganda o'ziga oladi — `open`dan
  // boshqa narsaga bog'liq emas. Aks holda (masalan `onClose` har render
  // sayin yangi funksiya bo'lgani uchun) forma ichida harf kiritilganda
  // effekt qayta ishga tushib, fokusni input'dan tortib olar edi.
  useEffect(() => {
    if (open) {
      dialogRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    // Fon o'zi scroll bo'ladi va ichki o'ram `min-h-full` bilan markazlashadi:
    // baland modal (masalan savol qo'shish formasi — 1143px) 844px lik telefon
    // ekraniga sig'masdi va `items-center` uni ikki tomondan kesib qo'yardi.
    // Natijada "Saqlash" tugmasiga umuman yetib bo'lmasdi, ya'ni owner
    // telefondan savol qo'sha olmasdi.
    <div
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-slate-950/55 backdrop-blur-[2px] [animation:fade-in_150ms_ease-out]"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          tabIndex={-1}
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "w-full rounded-xl border border-border bg-elevated p-5 shadow-pop sm:p-6 [animation:modal-in_160ms_ease-out]",
            size === "lg" ? "max-w-2xl" : "max-w-md"
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="modal-title"
                className="font-display text-lg font-bold text-text"
              >
                {title}
              </h2>
              {description && (
                <p className="mt-1 text-[13px] leading-relaxed text-text-muted">
                  {description}
                </p>
              )}
            </div>
            {/* Yopish tugmasi: ESC va fonni bosish ilgari ham ishlardi, lekin
                telefonda ikkalasi ham ko'rinmas edi — modaldan chiqish yo'li
                ekranda ko'rinib turishi kerak. */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Yopish"
              className="-mr-1.5 -mt-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-faint transition-colors hover:bg-bg-subtle hover:text-text"
            >
              <Icon name="x" className="h-[18px] w-[18px]" />
            </button>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
