"use client";

import { useState } from "react";
import { useServerMutation } from "@/lib/useServerMutation";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Icon } from "@/components/Icon";

/**
 * Bitta darsni bekor qilish.
 *
 * Tasdiq so'raladi, chunki amal qaytarilmaydi va dars o'chirilganda
 * o'quvchilar uni endi ko'rmaydi. Jadvalni butunlay qayta tuzish esa
 * `LessonScheduleModal` dagi "eski jadvalni almashtirish" kaliti orqali.
 */
export function LessonRowActions({
  lessonId,
  lessonLabel,
}: {
  lessonId: string;
  /** Tasdiq oynasida ko'rsatiladi: "Dushanba, 22-sen · 14:00". */
  lessonLabel: string;
}) {
  const { run, pending, error } = useServerMutation();
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    const ok = await run(() => fetch(`/api/lessons/${lessonId}`, { method: "DELETE" }));
    if (ok) setConfirming(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`${lessonLabel} darsini bekor qilish`}
        className="relative z-10 flex h-8 w-8 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-danger-soft hover:text-danger"
      >
        <Icon name="x" className="h-4 w-4" />
      </button>

      {confirming && (
        <Modal
          open
          onClose={() => setConfirming(false)}
          title="Darsni bekor qilish"
          description={lessonLabel}
        >
          <div className="space-y-4">
            {error && (
              <p className="rounded-md border border-danger/25 bg-danger-soft px-4 py-3 text-[13px] text-danger">
                {error}
              </p>
            )}
            <p className="text-[13px] leading-relaxed text-text-muted">
              Dars jadvaldan o&apos;chiriladi va o&apos;quvchilar uni endi
              ko&apos;rmaydi. Bu amalni qaytarib bo&apos;lmaydi.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirming(false)}
              >
                Bekor qilish
              </Button>
              <Button type="button" variant="danger" disabled={pending} onClick={handleDelete}>
                {pending ? "O'chirilmoqda..." : "Ha, o'chirish"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
