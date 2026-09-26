"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { cn } from "@/lib/cn";
import { REPORT_REASON_MAX_LENGTH } from "@/lib/questionReportLimits";

/**
 * Savol ustidagi ikkita amal: saqlash (xatcho'p) va shikoyat (bayroqcha).
 *
 * Ikkalasi bitta komponentda, chunki ular doim birga va bir xil joyda
 * turadi — test ekranida ham, natija ekranida ham. Ajratilsa, ikki
 * joyda joylashuvni alohida qo'lda moslash kerak bo'lardi.
 *
 * `dark` — test ekrani to'q qobiqda chiziladi; boshqa joylarda oddiy
 * (och) fon.
 */
export function QuestionActions({
  questionId,
  initiallySaved = false,
  dark = false,
}: {
  questionId: string;
  initiallySaved?: boolean;
  dark?: boolean;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [savePending, setSavePending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [reportPending, setReportPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleSave() {
    if (savePending) return;
    setSavePending(true);
    // Optimistik: tugma darhol javob beradi. Xato bo'lsa orqaga
    // qaytariladi — saqlash ikkilamchi amal, uning sababli test
    // yechish to'xtab qolmasligi kerak.
    const next = !saved;
    setSaved(next);
    try {
      const res = await fetch("/api/saved-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setSaved(Boolean(data.saved));
    } catch {
      setSaved(!next);
    } finally {
      setSavePending(false);
    }
  }

  async function sendReport() {
    setReportPending(true);
    setError(null);
    try {
      const res = await fetch("/api/question-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Yuborib bo'lmadi");
        return;
      }
      setReportSent(true);
      setReason("");
    } catch {
      setError("Tarmoq xatosi — qayta urinib ko'ring");
    } finally {
      setReportPending(false);
    }
  }

  const buttonClass = cn(
    "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
    dark
      ? "text-white/55 hover:bg-white/10 hover:text-white"
      : "text-text-faint hover:bg-surface-2 hover:text-text"
  );

  return (
    <>
      <span className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggleSave}
          aria-pressed={saved}
          aria-label={saved ? "Saqlanganlardan olib tashlash" : "Savolni saqlash"}
          title={saved ? "Saqlanganlardan olib tashlash" : "Savolni saqlash"}
          className={cn(buttonClass, saved && (dark ? "text-test-accent" : "text-brand"))}
        >
          <Icon
            name="bookmark"
            className="h-[18px] w-[18px]"
            fill={saved ? "currentColor" : "none"}
          />
        </button>
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          aria-label="Savolda xato bor"
          title="Savolda xato bor"
          className={buttonClass}
        >
          <Icon name="flag" className="h-[18px] w-[18px]" />
        </button>
      </span>

      <Modal
        open={reportOpen}
        onClose={() => {
          setReportOpen(false);
          setReportSent(false);
          setError(null);
        }}
        title="Savolda xato bor"
        description={
          reportSent
            ? undefined
            : "Savol matni, javob variantlari yoki to'g'ri deb belgilangan javob noto'g'ri bo'lsa — bizga bildiring."
        }
      >
        {reportSent ? (
          <div className="space-y-4">
            <p className="flex items-start gap-2 rounded-md bg-brand-soft px-3.5 py-3 text-[13px] text-text">
              <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              Yuborildi. Savollar bazasi mas&apos;uli uni tekshiradi.
            </p>
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => {
                  setReportOpen(false);
                  setReportSent(false);
                }}
              >
                Yopish
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <p className="rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger">
                {error}
              </p>
            )}
            <label
              htmlFor="report-reason"
              className="block text-[13px] font-semibold text-text"
            >
              Nima noto&apos;g&apos;ri? <span className="font-normal text-text-muted">(majburiy emas)</span>
            </label>
            <textarea
              id="report-reason"
              rows={3}
              maxLength={REPORT_REASON_MAX_LENGTH}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Masalan: to'g'ri javob B bo'lishi kerak"
              className="w-full rounded-md border border-border bg-bg px-3 py-2.5 text-[13.5px] text-text outline-none transition-colors placeholder:text-text-faint focus:border-brand"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setReportOpen(false)}
              >
                Bekor qilish
              </Button>
              <Button type="button" onClick={sendReport} disabled={reportPending}>
                {reportPending ? "Yuborilmoqda..." : "Yuborish"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
