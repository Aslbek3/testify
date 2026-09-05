"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { ROLE_HOME } from "@/lib/roles";
import type { Role } from "@prisma/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }

    const next = searchParams.get("next");
    router.push(next ?? ROLE_HOME[data.role as Role] ?? "/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-subtle px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-lg border border-border bg-bg p-8"
      >
        <div>
          <h1 className="text-xl font-semibold text-text">Kirish</h1>
          <p className="mt-1 text-sm text-text-muted">Testify hisobingizga kiring</p>
        </div>

        {error && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <Field
          id="email"
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Field
          id="password"
          label="Parol"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Kirilmoqda..." : "Kirish"}
        </Button>

        <p className="text-center text-sm text-text-muted">
          Hisobingiz yo&apos;qmi?{" "}
          <a href="/register" className="font-medium text-brand underline">
            Ro&apos;yxatdan o&apos;tish
          </a>
        </p>
      </form>
    </main>
  );
}
