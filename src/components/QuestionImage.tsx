"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Savol rasmi — bosilganda to'liq ekranda kattalashadi.
 *
 * Nega kerak: o'quvchilarning katta qismi telefondan ishlaydi va 390px
 * ekranda yo'l belgilari rasmi ~330px ga siqiladi. Chorraha chizmasidagi
 * strelkalar yoki belgi ichidagi raqam shu o'lchamda o'qilmaydi — savolga
 * javob berib bo'lmaydi. Raqobatchida ham (autotestlar.uz) rasm bosilganda
 * hech narsa bo'lmaydi; bu ularning kamchiligi, nusxa olinadigan yechim emas.
 */
export function QuestionImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string | null;
  className?: string;
}) {
  const [zoomed, setZoomed] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!zoomed) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        // Test ekranida klaviatura 1–5 bilan javob tanlanadi va Enter
        // keyingi savolga o'tadi. Overlay ochiq turganda o'sha tinglovchi
        // ham ishlab ketmasligi uchun hodisa shu yerda to'xtatiladi.
        event.stopPropagation();
        setZoomed(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [zoomed]);

  useEffect(() => {
    if (zoomed) overlayRef.current?.focus();
  }, [zoomed]);

  return (
    <>
      <button
        type="button"
        onClick={() => setZoomed(true)}
        aria-label="Rasmni kattalashtirish"
        className={cn(
          "group relative block overflow-hidden rounded-lg border border-border",
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt ?? ""} className="h-full w-full object-cover" />
        <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
          Kattalashtirish
        </span>
      </button>

      {zoomed && (
        <div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-label={alt ?? "Savol rasmi"}
          tabIndex={-1}
          onClick={() => setZoomed(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/85 p-4 [animation:fade-in_150ms_ease-out]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt ?? ""}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
          />
          <button
            type="button"
            onClick={() => setZoomed(false)}
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black"
          >
            Yopish
          </button>
        </div>
      )}
    </>
  );
}
