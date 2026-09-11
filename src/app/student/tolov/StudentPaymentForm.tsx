"use client";

import { useState, type FormEvent } from "react";
import { useServerMutation } from "@/lib/useServerMutation";
import { formatAmountUzs } from "@/lib/format";
import {
  MAX_RECEIPT_BYTES,
  RECEIPT_ACCEPT,
  STUDENT_PAYMENT_MONTHS,
  type StudentPaymentMonths,
} from "@/lib/payments";
import { Button } from "@/components/Button";
import { cn } from "@/lib/cn";

/**
 * Uch qadam, ekranda ham shu tartibda: muddat → kartaga o'tkazish →
 * chekni yuklash. O'quvchi nima qilishini tartib bilan ko'rsin — pul
 * shu sahifada yechilmaydi, u o'z bank ilovasida o'tkazadi.
 */
export function StudentPaymentForm({
  cardNumber,
  cardHolder,
  prices,
}: {
  /** Allaqachon guruhlangan ko'rinishda. */
  cardNumber: string;
  cardHolder: string;
  prices: Record<StudentPaymentMonths, number>;
}) {
  const [months, setMonths] = useState<StudentPaymentMonths>(1);
  const [file, setFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const { run, pending, error, setError } = useServerMutation();

  async function copyCard() {
    try {
      await navigator.clipboard.writeText(cardNumber.replace(/\s/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard ruxsati yo'q (masalan HTTP yoki eski brauzer) — raqam
      // baribir ekranda, o'quvchi qo'lda ko'chiradi.
    }
  }

  function pickFile(next: File | null) {
    setError(null);
    // Hajm shu yerda ham tekshiriladi: 20 MB rasmni yuklab bo'lgach
    // "5 MB dan oshmasin" deyish — sekin internetda bir necha daqiqa
    // behuda kutish. Haqiqiy tekshiruv baribir serverda.
    if (next && next.size > MAX_RECEIPT_BYTES) {
      setError("Chek hajmi 5 MB dan oshmasligi kerak");
      setFile(null);
      return;
    }
    setFile(next);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Chekni yuklang");
      return;
    }
    const form = new FormData();
    form.set("months", String(months));
    form.set("receipt", file);
    await run(() => fetch("/api/student-payments", { method: "POST", body: form }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-medium text-text">1. Muddatni tanlang</h3>
        <div className="grid grid-cols-2 gap-3">
          {STUDENT_PAYMENT_MONTHS.map((m) => (
            <label
              key={m}
              className={cn(
                "cursor-pointer rounded-md border px-4 py-3 transition-colors",
                months === m
                  ? "border-brand bg-brand/10"
                  : "border-border hover:border-text-muted"
              )}
            >
              <input
                type="radio"
                name="months"
                value={m}
                checked={months === m}
                onChange={() => setMonths(m)}
                className="sr-only"
              />
              <span className="block text-sm text-text-muted">{m} oy</span>
              <span className="block text-lg font-semibold text-text">
                {formatAmountUzs(prices[m])}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-medium text-text">
          2. Shu kartaga {formatAmountUzs(prices[months])} o&apos;tkazing
        </h3>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-4 py-3">
          <div>
            <p className="font-mono text-lg tracking-wide text-text">{cardNumber}</p>
            <p className="text-sm text-text-muted">{cardHolder}</p>
          </div>
          <Button type="button" variant="secondary" onClick={copyCard}>
            {copied ? "Nusxalandi" : "Nusxalash"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-text-muted">
          Click, Payme yoki bank ilovangiz orqali. Bu sahifa pul yechmaydi.
        </p>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-medium text-text">3. Chekni yuklang</h3>
        <input
          type="file"
          accept={RECEIPT_ACCEPT}
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-text file:mr-3 file:rounded-md file:border-0 file:bg-bg-subtle file:px-3 file:py-2 file:text-sm file:font-medium file:text-text"
        />
        <p className="mt-2 text-xs text-text-muted">
          Skrinshot yoki bank kvitansiyasi — JPG, PNG yoki PDF, 5 MB gacha.
        </p>
      </section>

      {error && (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending || !file}>
          {pending ? "Yuborilmoqda..." : "Chekni yuborish"}
        </Button>
      </div>
    </form>
  );
}
