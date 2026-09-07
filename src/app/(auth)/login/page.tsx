"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { ROLE_HOME } from "@/lib/roles";
import type { Role } from "@prisma/client";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

type LoginError = { status: number; message: string };

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<LoginError | null>(null);
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
      setError({ status: res.status, message: data.error ?? "Xatolik yuz berdi" });
      return;
    }

    const next = searchParams.get("next");
    router.push(next ?? ROLE_HOME[data.role as Role] ?? "/");
    router.refresh();
  }

  // 401 — parol/email noto'g'ri: xabar aynan Parol maydoniga bog'lanadi
  // (maydonni qizil ramka bilan belgilaydi), mockupdagi kabi. Boshqa
  // statuslar (403 — tarif tugagan, 429 — juda ko'p urinish, 400) uchun
  // umumiy ogohlantirish qutisi ko'rsatiladi.
  const isCredentialsError = error?.status === 401;
  const isBlockedError = error !== null && !isCredentialsError;

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-subtle px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-bg px-9 py-10"
      >
        <div className="flex flex-col items-center gap-1.5 text-center">
          <h1 className="text-xl font-bold tracking-tight text-text">Testify</h1>
          <p className="text-sm text-text-muted">Avtomaktab PDD test tayyorgarligi</p>
        </div>

        {isBlockedError && (
          <div className="flex flex-col gap-1 rounded-md border border-danger bg-danger/10 px-4 py-3.5">
            <p className="text-sm font-semibold text-danger">Kirish imkonsiz</p>
            <p className="text-sm leading-relaxed text-danger">{error.message}</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <Field
            id="email"
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="space-y-1">
            <Field
              id="password"
              label="Parol"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={isCredentialsError ? "border-danger text-danger" : undefined}
            />
            {isCredentialsError && (
              <p className="text-xs text-danger">{error.message}</p>
            )}
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Kirilmoqda..." : "Kirish"}
        </Button>

        <p className="text-center text-xs leading-relaxed text-text-muted">
          Hisobingiz yo&apos;q bo&apos;lsa, ustozingiz sizga hisob yaratadi.
          Ro&apos;yxatdan o&apos;tish talab qilinmaydi.
        </p>
      </form>
    </main>
  );
}
