"use client";

import { useState, type FormEvent } from "react";
import { useServerMutation } from "@/lib/useServerMutation";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Modal } from "@/components/Modal";
import { MAX_TEXT_LENGTH } from "@/lib/payments";

/**
 * Bitta kutayotgan to'lov uchun ikki amal: tasdiqlash va rad etish.
 *
 * Ikkalasi bitta `useServerMutation` ustida ishlaydi — shu sababli biri
 * ketayotganda ikkinchisi ham band bo'lib turadi. Bu ataylab: owner
 * "Tasdiqlash" bosgach, javob kelgunicha "Rad etish"ni bosa olmasligi
 * kerak (server ikkinchisini 409 bilan rad etadi, lekin foydalanuvchi
 * uchun bu tushunarsiz xato bo'lardi).
 *
 * `pending` so'rov TUGAB, jadval yangilangunicha `true` bo'lib turadi —
 * ya'ni qator ekrandan yo'qolgunicha tugma band. Shu sababli bu yerda
 * `router.refresh()` to'g'ridan-to'g'ri chaqirilmaydi.
 */
export function PaymentReviewActions({
  endpoint,
  payerName,
  amountLabel,
  nextEndsAtLabel,
  rejectNotice,
}: {
  /**
   * PATCH `{ action, reason? }` qabul qiladigan manzil. Ikki joyda
   * ishlatiladi: owner (`/api/payments/[id]` — avtomaktab obunasi) va
   * direktor (`/api/student-payments/[id]` — o'quvchi to'lovi). Mantiq
   * bir xil, faqat kim to'lagani va nima uzayishi farq qiladi.
   */
  endpoint: string;
  /** Kim to'lagan — rad etish oynasida ko'rsatiladi. */
  payerName: string;
  /** Tayyor formatlangan summa — matnda takror ko'rsatish uchun. */
  amountLabel: string;
  /** Tasdiqlansa muddat qaysi sanagacha uzayadi (formatlangan). */
  nextEndsAtLabel: string;
  /** Rad etish oynasidagi tushuntirish: nima bo'lmasligi va sababni kim ko'rishi. */
  rejectNotice: string;
}) {
  const { run, pending, error, setError } = useServerMutation();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  function patch(body: Record<string, unknown>) {
    return fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function handleConfirm() {
    await run(() => patch({ action: "confirm" }));
  }

  async function handleReject(event: FormEvent) {
    event.preventDefault();
    // Sabab MAJBURIY: to'lovchi "nega rad etildi" degan savolga javob
    // olmasa, xuddi shu chekni qayta yuboradi va aylanma boshlanadi.
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Rad etish sababini yozing");
      return;
    }
    const ok = await run(() => patch({ action: "reject", reason: trimmed }));
    if (ok) {
      setRejectOpen(false);
      setReason("");
    }
  }

  function closeReject() {
    setRejectOpen(false);
    setError(null);
  }

  return (
    <div className="space-y-2">
      {/* Xato tugmalarning yonida turadi: modal yopiq holatda tasdiqlash
          xatosini (masalan "allaqachon ko'rib chiqilgan") ko'rsatadigan
          boshqa joy yo'q. */}
      {error && !rejectOpen && (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={pending} onClick={handleConfirm}>
          {pending ? "Bajarilmoqda..." : "Tasdiqlash"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => {
            setError(null);
            setRejectOpen(true);
          }}
        >
          Rad etish
        </Button>
      </div>

      {/* Tasdiqlovchi nimani tasdiqlayotganini KO'RMASDAN bosmasligi
          kerak: tasdiqlash muddatni uzaytiradi va uni ortga qaytarish
          uchun alohida amal yo'q. Sana tugmaning aynan ostida turadi. */}
      <p className="text-sm text-text-muted">
        Tasdiqlansa:{" "}
        <span className="font-mono text-text">{nextEndsAtLabel}</span> gacha
      </p>

      <Modal
        open={rejectOpen}
        onClose={closeReject}
        title="To'lovni rad etish"
      >
        <form onSubmit={handleReject} className="space-y-4">
          {error && (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <p className="text-sm text-text-muted">
            <span className="font-medium text-text">{payerName}</span> —{" "}
            <span className="font-mono">{amountLabel}</span>. {rejectNotice}
          </p>

          <Field
            id={`reject-reason-${endpoint}`}
            label="Rad etish sababi"
            required
            maxLength={MAX_TEXT_LENGTH}
            placeholder="Masalan: ko'rsatilgan raqam bo'yicha to'lov topilmadi"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeReject}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Yuborilmoqda..." : "Rad etish"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
