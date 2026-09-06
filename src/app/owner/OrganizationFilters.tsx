"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SelectField } from "@/components/Field";
import { ORG_STATUS_LABEL } from "@/lib/labels";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Barchasi" },
  { value: "ACTIVE", label: ORG_STATUS_LABEL.ACTIVE },
  { value: "TRIAL", label: ORG_STATUS_LABEL.TRIAL },
  { value: "EXPIRED", label: ORG_STATUS_LABEL.EXPIRED },
];

/**
 * Qidiruv (nomi/shahar) va holat filtri — holat URL searchParams'da
 * (`q`, `status`) saqlanadi, shunda sahifani yangilash yoki havolani
 * ulashish joriy ko'rinishni saqlab qoladi. Saralash (`sort`) ustun
 * sarlavhalaridagi oddiy <Link>'lar orqali boshqariladi, bu yerda faqat
 * mavjud qiymati o'zgarmasdan URL'ga qo'shib yuboriladi.
 */
export function OrganizationFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentQ = searchParams.get("q") ?? "";
  const currentStatus = searchParams.get("status") ?? "";
  const currentSort = searchParams.get("sort");

  const [q, setQ] = useState(currentQ);

  // Boshqa joydan URL o'zgarsa (masalan "Filtrni tozalash" bosilganda),
  // input holatini sinxronlashtiramiz.
  useEffect(() => {
    setQ(currentQ);
  }, [currentQ]);

  function pushParams(next: { q?: string; status?: string }) {
    const nextQ = next.q !== undefined ? next.q : q;
    const nextStatus = next.status !== undefined ? next.status : currentStatus;

    const params = new URLSearchParams();
    if (nextQ) params.set("q", nextQ);
    if (nextStatus) params.set("status", nextStatus);
    if (currentSort) params.set("sort", currentSort);

    const qs = params.toString();
    router.push(qs ? `/owner?${qs}` : "/owner");
  }

  // Qidiruv inputini 300ms debounce bilan URL'ga yozamiz — har bir
  // bosilgan tugma uchun alohida navigatsiya bo'lmasligi uchun.
  useEffect(() => {
    if (q === currentQ) return;
    const timeout = setTimeout(() => {
      pushParams({ q });
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-full max-w-xs space-y-1">
        <label htmlFor="org-search" className="text-sm font-medium text-text">
          Qidiruv
        </label>
        <input
          id="org-search"
          type="text"
          placeholder="Nomi yoki shahar bo'yicha qidirish"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        />
      </div>
      <div className="w-48">
        <SelectField
          id="org-status"
          label="Holat"
          value={currentStatus}
          onChange={(e) => pushParams({ status: e.target.value })}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SelectField>
      </div>
    </div>
  );
}
