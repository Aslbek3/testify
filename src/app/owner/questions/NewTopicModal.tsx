"use client";

import { useState, type FormEvent } from "react";
import { useRefresh } from "@/lib/useServerMutation";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";

export function NewTopicModal({
  /**
   * Bazadagi mavjud guruh nomlari — taklif ro'yxati uchun.
   *
   * Guruh erkin matn, ya'ni "Yo'l belgilari" va "Yol belgilari" ikki
   * boshqa guruh bo'lib qolishi mumkin. Taklif ro'yxati buning oldini
   * oladi: owner odatda yozmaydi, tanlaydi.
   */
  categories,
}: {
  categories: string[];
}) {
  const { refresh, refreshing } = useRefresh();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // `refreshing` — sahifa yangilanishi tugagunicha tugma band qoladi.
  const busy = loading || refreshing;

  function close() {
    setOpen(false);
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }

    setName("");
    setCategory("");
    await refresh();
    setOpen(false);
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        + Yangi mavzu
      </Button>

      <Modal open={open} onClose={close} title="Yangi mavzu qo'shish">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <Field
            id="topic-name"
            label="Mavzu nomi"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Field
            id="topic-category"
            label="Katta guruh"
            hint="Majburiy emas. Masalan: Yo'l belgilari"
            list="topic-categories"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <datalist id="topic-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={close}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
