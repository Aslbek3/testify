"use client";

import { useState, type FormEvent } from "react";
import { useRefresh } from "@/lib/useServerMutation";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Field, SelectField } from "@/components/Field";
import { PasswordField } from "@/components/PasswordField";

export function NewDirectorModal({
  organizations,
}: {
  organizations: { id: string; name: string }[];
}) {
  const { refresh, refreshing } = useRefresh();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // `refreshing` — sahifa yangilanishi tugagunicha tugma band qoladi.
  const busy = loading || refreshing;

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

    const res = await fetch("/api/directors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, organizationId }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }

    setSuccess(`Direktor yaratildi: ${data.email}`);
    setName("");
    setEmail("");
    setPassword("");
    await refresh();
  }

  if (organizations.length === 0) {
    return null;
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        + Direktor qo&apos;shish
      </Button>

      <Modal open={open} onClose={close} title="Yangi direktor tayinlash">
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
            id="director-org"
            label="Tashkilot"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </SelectField>
          <Field
            id="director-name"
            label="To'liq ismi"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Field
            id="director-email"
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <PasswordField
            id="director-password"
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
            <Button type="submit" disabled={busy}>
              {busy ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
