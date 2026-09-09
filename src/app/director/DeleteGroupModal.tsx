"use client";

import { useServerMutation } from "@/lib/useServerMutation";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import type { GroupOverviewRow } from "@/services/directorDashboard";

/**
 * Guruhni o'chirishni tasdiqlash.
 *
 * "O'chirish mumkinmi?" qoidasi bu yerda TAKRORLANMAYDI — u faqat
 * servisda (`deleteGroup`) turadi va sababi bilan birga 400 javobida
 * qaytadi, shu matn quyida ko'rsatiladi. Klientda ikkinchi nusxa
 * saqlansa, qoida o'zgarganda ikkalasi bir-biridan ajralib ketardi.
 * Modal esa qaror uchun kerakli faktlarni (o'quvchi va urinish soni)
 * oldindan ko'rsatadi.
 */
export function DeleteGroupModal({
  group,
  onClose,
}: {
  group: GroupOverviewRow;
  onClose: () => void;
}) {
  const { run, pending, error } = useServerMutation();

  async function handleDelete() {
    // Modal ro'yxat haqiqatan yangilangach yopiladi — batafsil izoh
    // `useServerMutation` da.
    const ok = await run(() =>
      fetch(`/api/groups/${group.groupId}`, { method: "DELETE" })
    );
    if (ok) onClose();
  }

  return (
    <Modal open onClose={onClose} title={`"${group.groupName}" guruhini o'chirish`}>
      <div className="space-y-4">
        {error && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <p className="text-sm text-text">
          Guruh butunlay o&apos;chiriladi. Bu amalni ortga qaytarib
          bo&apos;lmaydi.
        </p>
        <ul className="space-y-1 text-sm text-text-muted">
          <li>
            Hozirgi o&apos;quvchilar:{" "}
            <span className="font-mono tabular-nums text-text">
              {group.studentCount}
            </span>
          </li>
          <li>
            Guruhdagi test urinishlari:{" "}
            <span className="font-mono tabular-nums text-text">
              {group.attemptCount}
            </span>
          </li>
        </ul>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="button" disabled={pending} onClick={handleDelete}>
            {pending ? "O'chirilmoqda..." : "O'chirish"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
