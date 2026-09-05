"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Field, SelectField } from "@/components/Field";

export function NewGroupModal({
  tutors,
}: {
  tutors: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [tutorId, setTutorId] = useState(tutors[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function close() {
    setOpen(false);
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, tutorId }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }

    setName("");
    setOpen(false);
    router.refresh();
  }

  if (tutors.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        Guruh qo&apos;shish uchun avval kamida bitta ustoz kerak.
      </p>
    );
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        + Guruh qo&apos;shish
      </Button>

      <Modal open={open} onClose={close} title="Yangi guruh qo'shish">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <Field
            id="group-name"
            label="Guruh nomi"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <SelectField
            id="group-tutor"
            label="Ustoz"
            value={tutorId}
            onChange={(e) => setTutorId(e.target.value)}
          >
            {tutors.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </SelectField>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={close}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
