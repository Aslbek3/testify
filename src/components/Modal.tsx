"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Animatsiya faqat shu yerda — foydalanuvchi ochgan harakatga javoban.
 * Boshqa hech qanday kartochka/komponentga hover-animatsiya qo'shilmaydi.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 [animation:fade-in_150ms_ease-out]"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-lg border border-border bg-bg p-6 [animation:modal-in_150ms_ease-out]"
      >
        <h2 id="modal-title" className="text-lg font-semibold text-text">
          {title}
        </h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
