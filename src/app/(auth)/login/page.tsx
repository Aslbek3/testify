"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Field, INPUT_ERROR_CLASS } from "@/components/Field";
import { PasswordField } from "@/components/PasswordField";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
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

/**
 * Chapdagi panelning pastki qismidagi yo'l tasviri.
 *
 * Sof SVG — rasm fayli emas: u temaga ergashadi, hajmi bir necha yuz bayt
 * va telefonda alohida so'rov talab qilmaydi.
 */
function RoadArtwork() {
  return (
    <svg
      viewBox="0 0 420 260"
      fill="none"
      aria-hidden="true"
      // Rang `currentColor` orqali BREND tokenidan keladi. Ilgari bu yerda
      // uchta ko'k hex (#3b82f6, #38bdf8, #7dd3fc) turardi — ular token
      // emas edi va brend turkuaziga ham mos kelmasdi: kirish sahifasi
      // ilovaning birinchi ekrani, unda brend rangi ko'rinishi kerak.
      // Chuqurlik endi rang bilan emas, `strokeOpacity` bilan beriladi.
      className="pointer-events-none absolute -bottom-6 left-0 w-[85%] max-w-[420px] text-brand opacity-70"
    >
      {/* Yo'lning ikki cheti — pastda kengayib, tepada bir nuqtaga yaqinlashadi */}
      <path
        d="M40 260C60 190 120 150 170 120 215 93 250 60 262 8"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeWidth="2"
      />
      <path
        d="M250 260C240 196 250 150 272 118 292 89 306 52 308 12"
        stroke="currentColor"
        strokeOpacity="0.5"
        strokeWidth="2"
      />
      {/* Markaziy uzuq chiziq */}
      <path
        d="M150 260C155 198 190 155 220 122 245 95 268 58 276 10"
        stroke="currentColor"
        strokeOpacity="0.45"
        strokeWidth="2"
        strokeDasharray="12 14"
      />
    </svg>
  );
}

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
    <main className="flex min-h-screen items-center justify-center bg-bg-subtle p-4 sm:p-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-xl bg-bg shadow-pop md:grid-cols-[0.92fr_1.08fr]">
        {/* Brend paneli. Telefonda ixchamlashadi, lekin butunlay yo'qolmaydi:
            o'quvchi kirish oynasini ochganda qaysi ilovaga kirayotganini
            ko'rishi kerak. */}
        <div className="relative overflow-hidden bg-navy px-7 py-9 text-white sm:px-10 sm:py-12 md:py-14">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-brand font-display text-lg font-bold text-white">
              T
            </span>
            <span className="font-display text-xl font-bold">Testify</span>
          </div>

          <h1 className="mt-10 max-w-sm font-display text-[28px] font-bold leading-[1.15] tracking-[-0.045em] sm:mt-14 sm:text-[34px]">
            Yo&apos;l qoidalarini bilish —{" "}
            <span className="text-brand">yo&apos;ldagi ishonch.</span>
          </h1>
          <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-white/60 sm:text-sm">
            Avtomaktablar uchun PDD test tayyorgarligi. Qoidalarni o&apos;rganing,
            bilimingizni mustahkamlang va imtihonga ishonch bilan kiring.
          </p>

          {/* Tasvir faqat kengroq ekranda: telefonda u matn bilan ustma-ust
              tushar va panelni keraksiz cho'zib yuborardi. */}
          <div className="relative mt-10 hidden h-44 md:block">
            <RoadArtwork />
          </div>
        </div>

        {/* Forma tomoni */}
        <div className="flex items-center justify-center px-6 py-10 sm:px-12 sm:py-14">
          <form onSubmit={handleSubmit} className="w-full max-w-sm">
            <p className="text-[13px] font-bold text-brand">Xush kelibsiz</p>
            <h2 className="mt-1.5 font-display text-[26px] font-bold tracking-[-0.04em] text-text sm:text-[30px]">
              Hisobingizga kiring
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-text-muted">
              Testify platformasiga kirish uchun email va parolni kiriting.
            </p>

            {isBlockedError && (
              <div className="mt-6 flex gap-2.5 rounded-md border border-danger/30 bg-danger-soft px-4 py-3.5">
                <Icon name="alertTriangle" className="mt-0.5 h-[18px] w-[18px] text-danger" />
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-danger">Kirish imkonsiz</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-danger">
                    {error.message}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-4">
              <Field
                id="email"
                label="Email"
                type="email"
                icon="mail"
                autoComplete="email"
                placeholder="sizning@emailingiz.uz"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <PasswordField
                id="password"
                label="Parol"
                icon="lock"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={isCredentialsError ? INPUT_ERROR_CLASS : undefined}
              />
              {isCredentialsError && (
                <p className="-mt-2.5 text-xs text-danger">{error.message}</p>
              )}
            </div>

            <Button type="submit" size="lg" disabled={loading} className="mt-6 w-full">
              {loading ? "Kirilmoqda..." : "Kirish"}
            </Button>

            {/* Parolni tiklash havolasi ATAYLAB yo'q: bunday funksiya hali
                yozilmagan. Ishlamaydigan havola qo'yilsa, o'quvchi uni bosib
                boshi berk ko'chaga kirib qolardi — parolni ustozi tiklaydi. */}
            <p className="mt-5 text-center text-xs leading-relaxed text-text-muted">
              Hisobingiz yo&apos;q bo&apos;lsa, uni{" "}
              <span className="font-semibold text-text">ustozingiz yaratadi</span>.
              Ro&apos;yxatdan o&apos;tish talab qilinmaydi.
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
