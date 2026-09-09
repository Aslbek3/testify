"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Field, SelectField } from "@/components/Field";
import { PasswordField } from "@/components/PasswordField";

export function NewStudentModal({
  groups,
}: {
  groups: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function close() {
    setOpen(false);
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const res = await fetch("/api/director/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, groupId }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }

    setSuccess(`O'quvchi qo'shildi: ${email}`);
    setName("");
    setEmail("");
    setPassword("");
    router.refresh();
  }

  if (groups.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" disabled>
          + Yangi o&apos;quvchi
        </Button>
        <span className="text-sm text-text-muted">Avval guruh yarating</span>
      </div>
    );
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        + Yangi o&apos;quvchi
      </Button>

      <Modal open={open} onClose={close} title="Yangi o'quvchi qo'shish">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
              {success}
            </p>
          )}

          <SelectField
            id="director-student-group"
            label="Guruh"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </SelectField>
          <Field
            id="director-student-name"
            label="To'liq ismi"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Field
            id="director-student-email"
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <PasswordField
            id="director-student-password"
            label="Vaqtinchalik parol"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={close}>
              Yopish
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
