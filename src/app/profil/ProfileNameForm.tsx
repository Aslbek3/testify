"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";

/**
 * Ismni tahrirlash — faqat foydalanuvchining O'ZI uchun.
 *
 * Standart holatda forma yopiq va ism oddiy matn bo'lib turadi: profilga
 * kirgan odamning ko'p hollarda ism o'zgartirish niyati yo'q, forma esa
 * sahifani shovqinli qiladi.
 */
export function ProfileNameForm({ currentName }: { currentName: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function cancel() {
    setName(currentName);
    setError(null);
    setEditing(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Xatolik yuz berdi");
        return;
      }
      setEditing(false);
      // Sidebar'dagi ism ham shu ma'lumotdan chiziladi — sahifani
      // yangilamasak, u eski ism bilan qolib ketardi.
      router.refresh();
    } catch {
      setError("Tarmoq xatosi — qayta urinib ko'ring");
    } finally {
      setLoading(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border py-3">
        <span className="text-sm text-text-muted">Ism</span>
        <span className="flex items-center gap-3">
          <span className="text-sm font-medium text-text">{currentName}</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm font-medium text-brand underline"
          >
            Tahrirlash
          </button>
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-b border-border py-3">
      {error && (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}
      <Field
        id="profile-name"
        label="Ism"
        required
        maxLength={60}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saqlanmoqda..." : "Saqlash"}
        </Button>
        <Button type="button" variant="secondary" onClick={cancel} disabled={loading}>
          Bekor qilish
        </Button>
      </div>
    </form>
  );
}
