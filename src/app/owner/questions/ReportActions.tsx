"use client";

import { useState } from "react";
import { useRefresh } from "@/lib/useServerMutation";
import { Button } from "@/components/Button";

/**
 * Shikoyatni yopish — ikki xil yakun bilan.
 *
 * "Tuzatildi" va "To'g'ri edi" ikkalasi ham ro'yxatdan chiqaradi; farqi
 * bazada saqlanadi (`RESOLVED` / `DISMISSED`). Bitta "Yopish" tugmasi
 * bo'lsa, keyinchalik "qaysi shikoyat haqli edi" degan savolga javob
 * bo'lmasdi.
 */
export function ReportActions({ reportId }: { reportId: string }) {
  const { refresh, refreshing } = useRefresh();
  const [pending, setPending] = useState<"RESOLVED" | "DISMISSED" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = pending !== null || refreshing;

  async function close(status: "RESOLVED" | "DISMISSED") {
    setPending(status);
    setError(null);
    const res = await fetch(`/api/question-reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Xatolik yuz berdi");
      setPending(null);
      return;
    }
    await refresh();
    setPending(null);
  }

  return (
    <span className="flex flex-wrap items-center justify-end gap-2">
      {error && <span className="text-[12px] text-danger">{error}</span>}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={() => close("DISMISSED")}
      >
        To&apos;g&apos;ri edi
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={busy}
        onClick={() => close("RESOLVED")}
      >
        Tuzatildi
      </Button>
    </span>
  );
}
