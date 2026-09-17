"use client";

import { useState, type FormEvent } from "react";
import { useServerMutation } from "@/lib/useServerMutation";
import { Button } from "@/components/Button";
import type { OrganizationSwitches } from "@/types/auth";

/**
 * Rol kalitlari — `docs/rollar.md` dagi to'rtta band.
 *
 * Yozuvlar shu yerda, bitta joyda: kalitning ma'nosi direktor uchun
 * tushunarli bo'lishi kerak, aks holda u "nima o'zgaradi?" deb
 * bosmaydi yoki bilmasdan bosadi.
 */
const SWITCHES: {
  key: keyof OrganizationSwitches;
  title: string;
  description: string;
}[] = [
  {
    key: "receptionHandlesPayments",
    title: "Qabulxona pul bilan ishlaydi",
    description:
      "Chekni tasdiqlaydi yoki rad etadi va naqd to'lovni qayd etadi. O'chirilsa — cheklarni faqat siz ko'rib chiqasiz.",
  },
  {
    key: "receptionSeesProgress",
    title: "Qabulxona natijalarni ko'radi",
    description:
      "O'quvchining ballari va urinishlari. O'chirilsa — faqat ro'yxat va to'lov holati ko'rinadi.",
  },
  {
    key: "tutorManagesStudents",
    title: "Ustoz o'quvchi qo'shadi va bloklaydi",
    description:
      "Qabulxonasi yo'q kichik avtomaktab uchun. Guruhga ko'chirish baribir ustozga berilmaydi.",
  },
  {
    key: "tutorResetsPasswords",
    title: "Ustoz parolni tiklay oladi",
    description:
      "Parolni tiklash o'quvchi hisobiga to'liq kirish imkonini beradi — shuning uchun alohida kalit.",
  },
];

export function RoleSettingsForm({ switches }: { switches: OrganizationSwitches }) {
  const { run, pending, error } = useServerMutation();
  const [values, setValues] = useState(switches);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaved(false);
    const ok = await run(() =>
      fetch("/api/director/role-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
    );
    if (ok) setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}
      {saved && !pending && (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          Saqlandi — o&apos;zgarish darhol kuchga kirdi.
        </p>
      )}

      {SWITCHES.map((item) => (
        <label
          key={item.key}
          className="flex items-start gap-3 rounded-md border border-border px-4 py-3"
        >
          <input
            type="checkbox"
            checked={values[item.key]}
            onChange={(e) => {
              setSaved(false);
              setValues((current) => ({ ...current, [item.key]: e.target.checked }));
            }}
            className="mt-1 h-4 w-4"
          />
          <span>
            <span className="block text-sm font-medium text-text">{item.title}</span>
            <span className="block text-sm text-text-muted">{item.description}</span>
          </span>
        </label>
      ))}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saqlanmoqda..." : "Saqlash"}
        </Button>
      </div>
    </form>
  );
}
