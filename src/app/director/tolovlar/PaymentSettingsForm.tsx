"use client";

import { useState, type FormEvent } from "react";
import { useServerMutation } from "@/lib/useServerMutation";
import { formatCardNumber } from "@/lib/format";
import {
  MAX_STUDENT_PRICE,
  MAX_TEXT_LENGTH,
  MAX_TRIAL_DAYS,
  MIN_STUDENT_PRICE,
  MIN_TRIAL_DAYS,
} from "@/lib/payments";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import type { StudentPaymentSettings } from "@/services/studentPayments";

/**
 * O'quvchi to'lovi sozlamalari.
 *
 * "Yoqish" alohida belgi: direktor karta va narxlarni oldindan kiritib,
 * tekshirib, keyin yoqadi. Yoqilmaguncha hech bir o'quvchi to'lov
 * sababli cheklanmaydi.
 */
export function PaymentSettingsForm({ settings }: { settings: StudentPaymentSettings }) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [cardNumber, setCardNumber] = useState(
    settings.cardNumber ? formatCardNumber(settings.cardNumber) : ""
  );
  const [cardHolder, setCardHolder] = useState(settings.cardHolder ?? "");
  const [priceOneMonth, setPriceOneMonth] = useState(settings.priceOneMonth?.toString() ?? "");
  const [priceSixMonths, setPriceSixMonths] = useState(settings.priceSixMonths?.toString() ?? "");
  const [trialDays, setTrialDays] = useState(settings.trialDays.toString());
  const [saved, setSaved] = useState(false);
  const { run, pending, error } = useServerMutation();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaved(false);
    const ok = await run(() =>
      fetch("/api/director/payment-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          cardNumber,
          cardHolder,
          priceOneMonth: priceOneMonth === "" ? null : Number(priceOneMonth),
          priceSixMonths: priceSixMonths === "" ? null : Number(priceSixMonths),
          trialDays: Number(trialDays),
        }),
      })
    );
    if (ok) setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="flex items-start gap-3 rounded-md border border-border px-4 py-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="mt-1 h-4 w-4"
        />
        <span>
          <span className="block text-sm font-medium text-text">
            O&apos;quvchi to&apos;lovini tizim orqali qabul qilish
          </span>
          <span className="block text-sm text-text-muted">
            Yoqilgach har bir o&apos;quvchi {trialDays || 0} kunlik bepul sinovdan
            keyin to&apos;lashi kerak bo&apos;ladi. Hozir o&apos;qiyotganlarning sinovi
            ham yoqilgan kundan boshlanadi — hech kim birdaniga yopilib qolmaydi.
          </span>
        </span>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          id="card-number"
          label="Karta raqami"
          inputMode="numeric"
          autoComplete="off"
          placeholder="8600 0000 0000 0000"
          // 16 raqam + ajratgich probel/chiziqchalar uchun joy.
          maxLength={23}
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
        />
        <Field
          id="card-holder"
          label="Karta egasi"
          placeholder="Ism Familiya"
          maxLength={MAX_TEXT_LENGTH}
          value={cardHolder}
          onChange={(e) => setCardHolder(e.target.value)}
        />
        <Field
          id="price-1"
          label="1 oylik narx (so'm)"
          type="number"
          inputMode="numeric"
          min={MIN_STUDENT_PRICE}
          max={MAX_STUDENT_PRICE}
          step={1}
          value={priceOneMonth}
          onChange={(e) => setPriceOneMonth(e.target.value)}
        />
        <Field
          id="price-6"
          label="6 oylik narx (so'm)"
          type="number"
          inputMode="numeric"
          min={MIN_STUDENT_PRICE}
          max={MAX_STUDENT_PRICE}
          step={1}
          value={priceSixMonths}
          onChange={(e) => setPriceSixMonths(e.target.value)}
        />
        <Field
          id="trial-days"
          label="Bepul sinov (kun)"
          type="number"
          inputMode="numeric"
          min={MIN_TRIAL_DAYS}
          max={MAX_TRIAL_DAYS}
          step={1}
          required
          value={trialDays}
          onChange={(e) => setTrialDays(e.target.value)}
        />
      </div>

      {error && (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && !pending && <span className="text-sm text-success">Saqlandi</span>}
        <Button type="submit" disabled={pending}>
          {pending ? "Saqlanmoqda..." : "Saqlash"}
        </Button>
      </div>
    </form>
  );
}
