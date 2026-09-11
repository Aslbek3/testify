"use client";

import { useState, type FormEvent } from "react";
import { useServerMutation } from "@/lib/useServerMutation";
import { formatAmountUzs } from "@/lib/format";
import { STUDENT_PAYMENT_MONTHS, type StudentPaymentMonths } from "@/lib/payments";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { SelectField } from "@/components/Field";

/**
 * Naqd to'lovni belgilash — o'quvchi avtomaktab kassasiga to'laganda.
 *
 * Chek yo'q, shuning uchun darhol tasdiqlangan hisoblanadi va tarixda
 * "Naqd" deb, belgilagan direktor nomi bilan yoziladi. Summani direktor
 * yozmaydi — avtomaktab narxidan olinadi, hisobot bilan to'g'ri kelsin.
 */
export function CashPaymentModal({
  studentId,
  studentName,
  prices,
  onClose,
}: {
  studentId: string;
  studentName: string;
  prices: Record<StudentPaymentMonths, number>;
  onClose: () => void;
}) {
  const [months, setMonths] = useState<StudentPaymentMonths>(1);
  const { run, pending, error } = useServerMutation();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await run(() =>
      fetch("/api/director/student-payments/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, months }),
      })
    );
    if (ok) onClose();
  }

  return (
    <Modal open onClose={onClose} title="Naqd to'lovni belgilash">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-text-muted">
          <span className="font-medium text-text">{studentName}</span> avtomaktab
          kassasiga naqd to&apos;ladi. Belgilangach muddati darhol uzayadi —
          buni ortga qaytarib bo&apos;lmaydi.
        </p>

        {error && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

        <SelectField
          id={`cash-months-${studentId}`}
          label="Muddat"
          value={months}
          onChange={(e) => setMonths(Number(e.target.value) as StudentPaymentMonths)}
        >
          {STUDENT_PAYMENT_MONTHS.map((m) => (
            <option key={m} value={m}>
              {m} oy — {formatAmountUzs(prices[m])}
            </option>
          ))}
        </SelectField>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saqlanmoqda..." : "Naqd to'landi"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
