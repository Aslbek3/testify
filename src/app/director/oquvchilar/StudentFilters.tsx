"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SelectField } from "@/components/Field";

/**
 * Qidiruv (ism) va guruh filtri — holat URL searchParams'da (`q`, `group`)
 * saqlanadi, xuddi Owner'ning tashkilotlar jadvalidagi kabi.
 */
export function StudentFilters({ groups }: { groups: { id: string; name: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentQ = searchParams.get("q") ?? "";
  const currentGroup = searchParams.get("group") ?? "";

  const [q, setQ] = useState(currentQ);

  // URL tashqaridan o'zgarsa (masalan "Filtrni tozalash" bosilganda yoki
  // brauzerda orqaga qaytilganda) input holati unga moslashadi.
  //
  // Bu ATAYLAB `useEffect` emas, render paytida tuzatish: React'ning
  // tavsiya qilgan naqshi. `useEffect` bilan qilinganda ekranga avval
  // eski qiymat chiziladi, keyin ikkinchi render bilan almashadi —
  // ko'zga tashlanadigan miltillash. Render paytida `setState` chaqirilsa
  // React joriy render'ni tashlab, darhol yangi qiymat bilan qayta
  // chizadi va oraliq holat umuman ekranga chiqmaydi.
  const [syncedQ, setSyncedQ] = useState(currentQ);
  if (syncedQ !== currentQ) {
    setSyncedQ(currentQ);
    setQ(currentQ);
  }

  function pushParams(next: { q?: string; group?: string }) {
    const nextQ = next.q !== undefined ? next.q : q;
    const nextGroup = next.group !== undefined ? next.group : currentGroup;

    const params = new URLSearchParams();
    if (nextQ) params.set("q", nextQ);
    if (nextGroup) params.set("group", nextGroup);

    const qs = params.toString();
    router.push(qs ? `/director/oquvchilar?${qs}` : "/director/oquvchilar");
  }

  useEffect(() => {
    if (q === currentQ) return;
    const timeout = setTimeout(() => pushParams({ q }), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-full max-w-xs space-y-1">
        <label htmlFor="student-search" className="text-sm font-medium text-text">
          Qidiruv
        </label>
        <input
          id="student-search"
          type="text"
          placeholder="Ism bo'yicha qidirish"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        />
      </div>
      <div className="w-48">
        <SelectField
          id="student-group-filter"
          label="Guruh"
          value={currentGroup}
          onChange={(e) => pushParams({ group: e.target.value })}
        >
          <option value="">Barchasi</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </SelectField>
      </div>
    </div>
  );
}
