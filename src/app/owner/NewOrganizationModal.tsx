"use client";

import { useState, type FormEvent } from "react";
import { useRefresh } from "@/lib/useServerMutation";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Field, SelectField } from "@/components/Field";

export function NewOrganizationModal() {
  const { refresh, refreshing } = useRefresh();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [plan, setPlan] = useState("STANDARD");
  const [status, setStatus] = useState("TRIAL");
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

    const res = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, city, plan, status }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }

    setName("");
    setCity("");
    await refresh();
    setOpen(false);
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        + Yangi tashkilot
      </Button>

      <Modal open={open} onClose={close} title="Yangi tashkilot qo'shish">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <Field
            id="org-name"
            label="Avtomaktab nomi"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Field
            id="org-city"
            label="Shahar"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <SelectField
            id="org-plan"
            label="Tarif rejasi"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
          >
            <option value="START">Start</option>
            <option value="STANDARD">Standart</option>
            <option value="PRO">Pro</option>
          </SelectField>
          <SelectField
            id="org-status"
            label="Holat"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="TRIAL">Sinov muddati</option>
            <option value="ACTIVE">Faol</option>
          </SelectField>

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
