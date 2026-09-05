"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { GroupOption } from "@/services/auth";
import { Field, SelectField } from "@/components/Field";
import { Button } from "@/components/Button";

export function RegisterForm({ groups }: { groups: GroupOption[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, phone, groupId }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }

    router.push("/student");
    router.refresh();
  }

  if (groups.length === 0) {
    return (
      <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
        Hozircha ro&apos;yxatdan o&apos;tish uchun ochiq guruh yo&apos;q. Ustozingizdan
        so&apos;rang.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <Field id="name" label="Ism familiya" required value={name} onChange={(e) => setName(e.target.value)} />
      <Field id="email" label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field id="phone" label="Telefon (ixtiyoriy)" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Field
        id="password"
        label="Parol"
        type="password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <SelectField id="group" label="Guruhingiz" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.label}
          </option>
        ))}
      </SelectField>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Yuborilmoqda..." : "Ro'yxatdan o'tish"}
      </Button>
    </form>
  );
}
