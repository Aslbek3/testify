"use client";

import { useState, type FormEvent } from "react";
import type { Plan } from "@prisma/client";
import { useServerMutation } from "@/lib/useServerMutation";
import { PLAN_LABEL } from "@/lib/labels";
import { Modal } from "@/components/Modal";
import {
  ALLOWED_MONTHS,
  MAX_AMOUNT,
  MAX_TEXT_LENGTH,
  MIN_AMOUNT,
} from "@/lib/payments";
import { Button } from "@/components/Button";
import { Field, SelectField } from "@/components/Field";

/**
 * Tariflar ro'yxati bu yerda qo'lda yozilmaydi — `PLAN_LABEL` kalitlaridan
 * olinadi. Aks holda sxemaga yangi tarif qo'shilganda uni bu ro'yxatga ham
 * qo'shish esdan chiqar edi va direktor yangi tarifni umuman tanlay
 * olmasdi.
 */
const PLAN_OPTIONS = Object.keys(PLAN_LABEL) as Plan[];

/**
 * Direktor "men to'ladim" deb xabar beradigan forma.
 *
 * ⚠️ Bu forma TO'LOVNI AMALGA OSHIRMAYDI va hech qanday pul yechmaydi —
 * to'lov bank yoki to'lov tizimi orqali oldindan qilinadi, bu esa faqat
 * xabar. Shu sabab modal ichidagi birinchi narsa — aynan shuni tushuntirib
 * beruvchi matn: usiz direktor tugmani bosib "pul yechildi" deb o'ylashi
 * mumkin edi.
 */
export function PaymentModal({
  currentPlan,
  hasPendingPayment,
}: {
  /** Tashkilotning hozirgi tarifi — formaning boshlang'ich qiymati. */
  currentPlan: Plan;
  /** Tasdiq kutayotgan xabar bo'lsa yangisini yuborib bo'lmaydi. */
  hasPendingPayment: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  // Muddatning boshlang'ich qiymati ham ro'yxatning o'zidan olinadi —
  // "1" deb yozib qo'yilsa, ruxsat etilgan muddatlar o'zgarganda bu
  // qiymat ro'yxatda yo'q bo'lib qolishi mumkin edi.
  const [months, setMonths] = useState<number>(ALLOWED_MONTHS[0]);
  // Boshlang'ich qiymat — tashkilotning HOZIRGI tarifi. Odatiy holat
  // shu tarifni uzaytirish; tarifni almashtirish esa kamdan-kam va
  // ataylab qilinadigan ish, ya'ni direktor uni o'zi tanlaydi.
  const [plan, setPlan] = useState<Plan>(currentPlan);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const { run, pending, error, setError } = useServerMutation();

  function close() {
    setOpen(false);
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    // Modal xabar yuborilib, sahifa YANGILANGANDAN keyin yopiladi.
    // Ilgarigi (`router.refresh()` + darhol yopish) usulda kartochka bir
    // necha soniya eski holatda turardi — direktor uchun bu "xabar
    // ketmadi" ko'rinishida edi va u tugmani qayta bosardi.
    const ok = await run(() =>
      fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Summa maydonda satr sifatida saqlanadi (bo'sh holatni
          // ko'rsata olish uchun), API esa son kutadi.
          amount: Number(amount),
          months,
          plan,
          reference,
          note,
        }),
      })
    );

    if (ok) {
      // Forma tozalanadi: keyingi safar (masalan xabar rad etilgandan
      // keyin) eski summa va to'lov raqami qolib ketmasin. Tarif esa
      // hozirgisiga qaytariladi — bo'sh qiymat `Plan` turida yo'q va
      // odatiy tanlov baribir shu.
      setAmount("");
      setPlan(currentPlan);
      setReference("");
      setNote("");
      setOpen(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        disabled={hasPendingPayment}
      >
        To&apos;lov haqida xabar berish
      </Button>

      <Modal open={open} onClose={close} title="To'lov haqida xabar berish">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Eng muhim matn — formaning eng boshida. */}
          <div className="rounded-md border border-border bg-bg-subtle px-3 py-2 text-sm text-text-muted">
            <p className="font-medium text-text">
              Bu forma to&apos;lovni amalga oshirmaydi.
            </p>
            <p className="mt-1">
              Pul yechilmaydi. To&apos;lovni bank yoki to&apos;lov tizimi
              orqali oldindan qilgan bo&apos;lishingiz kerak — bu yerda faqat
              o&apos;sha to&apos;lov haqida xabar berasiz. Xabarni platforma
              egasi ko&apos;chirma bilan solishtirib tasdiqlaydi, shundan
              keyin obuna uzayadi.
            </p>
          </div>

          {error && (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <Field
            id="payment-amount"
            label="To'lov summasi (so'm)"
            type="number"
            inputMode="numeric"
            // Tiyin ishlatilmaydi — summa butun son (sxemadagi `amount Int`).
            step={1}
            // Chegaralar serverdagi tekshiruv bilan bir xil manbadan
            // (`lib/payments.ts`) olinadi. Bu himoya emas — haqiqiy
            // tekshiruv doim `submitPayment()` da; bu yerdagisi shunchaki
            // direktor formani to'ldirib bo'lgach xatoga urilib
            // qolmasligi uchun.
            min={MIN_AMOUNT}
            max={MAX_AMOUNT}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <SelectField
            id="payment-months"
            label="Muddat"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
          >
            {ALLOWED_MONTHS.map((m) => (
              <option key={m} value={m}>
                {m} oy
              </option>
            ))}
          </SelectField>

          <SelectField
            id="payment-plan"
            label="Tarif"
            required
            value={plan}
            onChange={(e) => setPlan(e.target.value as Plan)}
          >
            {PLAN_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {PLAN_LABEL[p]}
              </option>
            ))}
          </SelectField>

          <Field
            id="payment-reference"
            label="To'lov raqami (ixtiyoriy)"
            maxLength={MAX_TEXT_LENGTH}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
          <Field
            id="payment-note"
            label="Izoh (ixtiyoriy)"
            maxLength={MAX_TEXT_LENGTH}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <p className="text-sm text-text-muted">
            To&apos;lov raqami (kvitansiya yoki tranzaksiya raqami)
            ko&apos;rsatilsa, xabar tezroq tasdiqlanadi — uni ko&apos;chirmada
            topish oson bo&apos;ladi.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={close}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Yuborilmoqda..." : "Xabar yuborish"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
