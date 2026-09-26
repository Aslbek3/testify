"use client";

import { useState } from "react";
import { useServerMutation } from "@/lib/useServerMutation";
import { Button } from "@/components/Button";
import { ResetPasswordModal } from "@/components/ResetPasswordModal";

/**
 * Jurnal qatoridagi ustoz amallari — bloklash/tiklash va parolni tiklash.
 *
 * Ilgari bular `TutorRankingTable` ichida edi va faqat direktor panelida
 * turardi. Endi ustozlar jurnali to'liq ro'yxatni ko'rsatgani uchun
 * amallar ham shu yerda: bitta ustozni topib, darhol boshqarish mumkin.
 *
 * `relative z-10` — qator butunlay bosiladigan havola (`after:inset-0`),
 * shuning uchun tugmalar uning ustida turishi kerak.
 */
export function TutorRowActions({
  tutorId,
  tutorName,
  isActive,
}: {
  tutorId: string;
  tutorName: string;
  isActive: boolean;
}) {
  // `pending` so'rov ham, sahifa yangilanishi ham tugaganini bildiradi —
  // tugma jadval haqiqatan yangilangunicha band holatda qoladi.
  const { run, pending, error } = useServerMutation();
  const [resetOpen, setResetOpen] = useState(false);

  async function handleToggle() {
    await run(() =>
      fetch(`/api/staff/${tutorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      })
    );
  }

  return (
    <div className="relative z-10 flex flex-wrap justify-end gap-2">
      {/* Xato aynan shu qator yonida chiqadi: ilgari u umuman
          ko'rsatilmasdi va tugma jimgina avvalgi holatiga qaytardi. */}
      {error && (
        <p className="w-full text-right text-[11.5px] font-semibold text-danger">
          {error}
        </p>
      )}
      <Button
        type="button"
        size="sm"
        variant={isActive ? "secondary" : "primary"}
        disabled={pending}
        onClick={handleToggle}
      >
        {pending ? "..." : isActive ? "Bloklash" : "Tiklash"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => setResetOpen(true)}
      >
        Parol
      </Button>

      {resetOpen && (
        <ResetPasswordModal
          open
          onClose={() => setResetOpen(false)}
          endpoint={`/api/staff/${tutorId}/password`}
          userName={tutorName}
        />
      )}
    </div>
  );
}
