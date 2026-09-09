"use client";

import { useState, type FormEvent } from "react";
import { useRefresh } from "@/lib/useServerMutation";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { PasswordField } from "@/components/PasswordField";

/**
 * Ustoz o'z o'quvchisiga, direktor o'z ustoziga yangi parol belgilashi
 * uchun umumiy modal — faqat `endpoint` orqali farqlanadi.
 */
export function ResetPasswordModal({
  open,
  onClose,
  endpoint,
  userName,
}: {
  open: boolean;
  onClose: () => void;
  endpoint: string;
  userName: string;
}) {
  const { refresh, refreshing } = useRefresh();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // `refreshing` — sahifa yangilanishi tugagunicha tugma band qoladi.
  const busy = loading || refreshing;

  function close() {
    setPassword("");
    setError(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }

    close();
    await refresh();
  }

  return (
    <Modal open={open} onClose={close} title={`${userName} uchun parolni tiklash`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}
        <PasswordField
          id="reset-password"
          label="Yangi parol"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={close}>
            Bekor qilish
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saqlanmoqda..." : "Parolni tiklash"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
