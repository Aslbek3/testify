"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { ResetPasswordModal } from "@/components/ResetPasswordModal";

/**
 * O'quvchi sahifasidagi amallar — jadvaldagilar bilan AYNI endpoint'larga
 * boradi (`RosterTable` dagi kabi), shunchaki boshqa joyda ko'rsatiladi.
 */
export function StudentActions({
  studentId,
  studentName,
  isActive,
}: {
  studentId: string;
  studentName: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  async function toggleActive() {
    setToggling(true);
    setError(null);
    try {
      const res = await fetch(`/api/tutor/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Amalni bajarib bo'lmadi");
        return;
      }
      router.refresh();
    } catch {
      setError("Tarmoq xatosi — qayta urinib ko'ring");
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => setResetOpen(true)}>
          Parolni tiklash
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={toggling}
          onClick={toggleActive}
        >
          {toggling ? "..." : isActive ? "Bloklash" : "Tiklash"}
        </Button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {resetOpen && (
        <ResetPasswordModal
          open
          onClose={() => setResetOpen(false)}
          endpoint={`/api/tutor/students/${studentId}/password`}
          userName={studentName}
        />
      )}
    </div>
  );
}
