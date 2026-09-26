"use client";

import { useState } from "react";
import { useRefresh } from "@/lib/useServerMutation";
import { Button } from "@/components/Button";
import { ResetPasswordModal } from "@/components/ResetPasswordModal";

/**
 * O'quvchi sahifasidagi amallar — jadvaldagilar bilan AYNI endpoint'larga
 * boradi (`RosterTable` dagi kabi), shunchaki boshqa joyda ko'rsatiladi.
 *
 * Qaysi tugma ko'rinishini ROL emas, proplar hal qiladi: sahifa
 * `lib/permissions.ts` dan javob oladi va shu yerga uzatadi. Shuning
 * uchun bu yerda birorta ham "agar ustoz bo'lsa" degan shart yo'q —
 * ruxsat mantiqi bitta joyda qoladi.
 */
export function StudentActions({
  studentId,
  studentName,
  isActive,
  canBlock,
  canResetPassword,
}: {
  studentId: string;
  studentName: string;
  isActive: boolean;
  /** Hisobni bloklash/tiklash — `canManageStudent`. */
  canBlock: boolean;
  /** Parolni tiklash — ALOHIDA ruxsat (`canResetStudentPassword`). */
  canResetPassword: boolean;
}) {
  const { refresh, refreshing } = useRefresh();
  const [toggling, setToggling] = useState(false);
  // `refreshing` — sahifa yangilanishi tugagunicha tugma band qoladi.
  const busy = toggling || refreshing;
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  async function toggleActive() {
    setToggling(true);
    setError(null);
    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Amalni bajarib bo'lmadi");
        return;
      }
      await refresh();
    } catch {
      setError("Tarmoq xatosi — qayta urinib ko'ring");
    } finally {
      setToggling(false);
    }
  }

  // Ikkalasi ham yo'q bo'lsa blok umuman chizilmaydi — bo'sh joy qolmaydi.
  if (!canBlock && !canResetPassword) return null;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        {canResetPassword && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setResetOpen(true)}
          >
            Parolni tiklash
          </Button>
        )}
        {canBlock && (
          <Button
            type="button"
            size="sm"
            variant={isActive ? "secondary" : "primary"}
            disabled={busy}
            onClick={toggleActive}
          >
            {busy ? "..." : isActive ? "Bloklash" : "Tiklash"}
          </Button>
        )}
      </div>

      {error && <p className="text-[12.5px] font-semibold text-danger">{error}</p>}

      {resetOpen && (
        <ResetPasswordModal
          open
          onClose={() => setResetOpen(false)}
          endpoint={`/api/students/${studentId}/password`}
          userName={studentName}
        />
      )}
    </div>
  );
}
