"use client";

import { useState, type FormEvent } from "react";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { PASSWORD_MIN_LENGTH } from "@/lib/password";

const EMPTY = { current: "", next: "", confirm: "" };

export function ChangePasswordForm() {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  function setField(key: keyof typeof EMPTY, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Xabarni yozishni boshlash bilan tozalaymiz — eski xato yangi
    // urinish ustida turib qolmasin.
    setError(null);
    setDone(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    // Tasdiqlash maydoni faqat klientda tekshiriladi: bu foydalanuvchining
    // xato yozishidan himoya, xavfsizlik tekshiruvi emas. Serverga uni
    // yuborishning ma'nosi yo'q.
    if (form.next !== form.confirm) {
      setError("Yangi parol va tasdiqlash mos kelmadi");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.current,
          newPassword: form.next,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? "Xatolik yuz berdi");
        return;
      }

      setForm(EMPTY);
      setDone(true);
    } catch {
      setError("Tarmoq xatosi — qayta urinib ko'ring");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Parolni o&apos;zgartirish</CardTitle>
      </CardHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        {done && (
          <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
            Parol o&apos;zgartirildi. Boshqa qurilmalardagi sessiyalar
            yakunlandi.
          </p>
        )}

        <Field
          id="current-password"
          label="Joriy parol"
          type="password"
          autoComplete="current-password"
          required
          value={form.current}
          onChange={(e) => setField("current", e.target.value)}
        />
        <Field
          id="new-password"
          label="Yangi parol"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          value={form.next}
          onChange={(e) => setField("next", e.target.value)}
        />
        <Field
          id="confirm-password"
          label="Yangi parolni tasdiqlang"
          type="password"
          autoComplete="new-password"
          required
          value={form.confirm}
          onChange={(e) => setField("confirm", e.target.value)}
        />

        <p className="text-xs leading-relaxed text-text-muted">
          Kamida {PASSWORD_MIN_LENGTH} belgi. Parol o&apos;zgargach boshqa
          qurilmalarda ochiq qolgan sessiyalar yakunlanadi — shu qurilmada
          esa ochiq qolasiz.
        </p>

        <Button type="submit" disabled={loading}>
          {loading ? "Saqlanmoqda..." : "Parolni o'zgartirish"}
        </Button>
      </form>
    </Card>
  );
}
