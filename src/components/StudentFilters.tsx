"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SelectField, INPUT_CLASS } from "@/components/Field";
import { Icon } from "@/components/Icon";

/**
 * Qidiruv (ism) va guruh filtri — holat URL searchParams'da (`q`, `group`)
 * saqlanadi, xuddi Owner'ning tashkilotlar jadvalidagi kabi.
 *
 * `basePath` — qaysi sahifaga qaytariladi (`/director/oquvchilar` yoki
 * `/qabulxona/oquvchilar`). Yagona farq shu: ikkala ro'yxat bir xil
 * ishlaydi va bir xil parametrlarni tushunadi.
 */
export function StudentFilters({
  groups,
  basePath,
}: {
  groups: { id: string; name: string }[];
  basePath: string;
}) {
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

    // Boshqa parametrlar (masalan holat filtri `filtr`) SAQLANADI.
    // Ilgari bu yerda bo'sh `URLSearchParams` yaratilardi va qidiruvga
    // harf kiritilishi bilan tanlangan holat filtri yo'qolib ketardi.
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("group");
    if (nextQ) params.set("q", nextQ);
    if (nextGroup) params.set("group", nextGroup);

    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  useEffect(() => {
    if (q === currentQ) return;
    const timeout = setTimeout(() => pushParams({ q }), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-full max-w-xs space-y-1.5">
        <label htmlFor="student-search" className="text-[13px] font-semibold text-text">
          Qidiruv
        </label>
        <div className="relative">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-text-faint"
          />
          <input
            id="student-search"
            type="search"
            placeholder="Ism bo'yicha qidirish"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={`${INPUT_CLASS} pl-10`}
          />
        </div>
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
