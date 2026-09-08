"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { MistakeItem } from "@/services/mistakes";

/**
 * Takrorlanish yorlig'i shu chegaradan boshlab ko'rsatiladi.
 * "1 marta xato qildingiz" hech qanday yangi ma'lumot bermaydi — ro'yxatda
 * turgan har bir savol kamida bir marta xato qilingan.
 */
const REPEAT_BADGE_MIN_WRONG_COUNT = 2;

type Tab = "still-wrong" | "fixed";

/**
 * Xatolar ro'yxati, ikkita yorliq bilan.
 *
 * Nega ikkiga bo'lingan: oddiy "barcha xatolar" ro'yxati faqat o'sib boradi
 * va o'quvchiga hech qachon tugamaydigan qarz kabi ko'rinadi. Oxirgi javobi
 * to'g'ri bo'lgan savol ("Tuzatilgan") asosiy ro'yxatdan chiqib ketadi —
 * shunda o'rganilgani sayin ro'yxat QISQARADI. Tuzatilganlar ham
 * o'chirilmaydi: takrorlash uchun kerak bo'lishi mumkin, shunchaki alohida
 * yorliq ostida turadi.
 */
export function MistakesList({ items }: { items: MistakeItem[] }) {
  const stillWrong = items.filter((item) => !item.isFixed);
  const fixed = items.filter((item) => item.isFixed);

  // Standart ko'rinish — "Hali xato". Lekin hammasi tuzatilgan bo'lsa bo'sh
  // ro'yxat ko'rsatmaslik uchun darhol "Tuzatilgan"ga o'tiladi.
  const [tab, setTab] = useState<Tab>(stillWrong.length > 0 ? "still-wrong" : "fixed");

  const visible = tab === "still-wrong" ? stillWrong : fixed;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-text">Xato qilingan savollar</p>
        <div
          role="tablist"
          aria-label="Ko'rinish"
          className="flex overflow-hidden rounded-md border border-border"
        >
          {(
            [
              ["still-wrong", `Hali xato (${stillWrong.length})`],
              ["fixed", `Tuzatilgan (${fixed.length})`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                tab === value
                  ? "bg-brand-soft text-brand"
                  : "bg-bg text-text-muted hover:bg-bg-subtle"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-text-muted">
          {tab === "still-wrong"
            ? "Tuzatilmagan xato qolmadi — barcha xato qilgan savollaringizga oxirgi marta to'g'ri javob berdingiz."
            : "Hali birorta xato tuzatilmagan. Xato qilgan savolingiz keyingi testda to'g'ri chiqsa, shu yerga o'tadi."}
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-md border border-border">
          {visible.map((item) => (
            <div key={item.questionId} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-text">{item.text}</p>
                <span
                  className={cn(
                    "shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold",
                    item.isFixed
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-danger/40 bg-danger/10 text-danger"
                  )}
                >
                  {item.isFixed ? "Tuzatilgan" : "Hali xato"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                <span>{item.topicName}</span>
                {/* Takrorlanish soni — "bu savolda uch marta qoqilgansiz"
                    degan signal, o'quvchi shundan boshlashi kerak. */}
                {item.wrongCount >= REPEAT_BADGE_MIN_WRONG_COUNT && (
                  <span className="font-medium text-danger">
                    {item.wrongCount} marta xato
                  </span>
                )}
                <span>Oxirgi xato: {formatDate(item.lastWrongAt)}</span>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {/* Tuzatilgan savolda oxirgi javob AYNAN to'g'ri javob —
                    ikkalasini yonma-yon takrorlash faqat shovqin bo'lardi,
                    shuning uchun "sizning javobingiz" faqat hali xato
                    bo'lganlarda ko'rsatiladi. */}
                {!item.isFixed && (
                  <span className="text-danger">
                    Sizning javobingiz: {item.lastAnswerText ?? "—"}
                  </span>
                )}
                <span className="text-success">
                  To&apos;g&apos;ri javob: {item.correctAnswerText}
                </span>
              </div>

              {item.explanation && (
                <p className="text-xs leading-relaxed text-text-muted">{item.explanation}</p>
              )}

              {/* Huquqiy asos alohida qatorda — natija sahifasidagi bilan
                  bir xil ko'rinish. */}
              {item.legalReference && (
                <p className="text-xs font-medium text-brand">{item.legalReference}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
