"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { ReviewQuestion, ReviewQuestionStatus } from "@/services/attempts";

const STATUS_LABEL: Record<ReviewQuestionStatus, string> = {
  correct: "To'g'ri",
  wrong: "Xato",
  unanswered: "Javobsiz",
};

const STATUS_CLASS: Record<ReviewQuestionStatus, string> = {
  correct: "border-success/40 bg-success/10 text-success",
  wrong: "border-danger/40 bg-danger/10 text-danger",
  // Javobsiz — xato emas, "bajarilmagan": sariq, qizil emas. Ustoz uchun
  // bu boshqa muammo (bilim emas, vaqt yetishmagan).
  unanswered: "border-warning/40 bg-warning/10 text-warning",
};

type Filter = "missed" | "all";

/**
 * Natija ekranidagi savollarni ko'rib chiqish.
 *
 * Ikkita ko'rinish bor, chunki ikkalasi ikki xil ehtiyoj:
 * - "Xatolar" — nimani takrorlash kerakligini ko'rsatadi;
 * - "Hammasi" — to'g'ri javob bergan savolni ham qayta o'qish uchun.
 *   O'quvchi taxmin qilib to'g'ri tushgan bo'lishi mumkin, unda izohni
 *   o'qimasa bilim qo'shilmaydi.
 */
export function ResultReview({ questions }: { questions: ReviewQuestion[] }) {
  const missed = questions.filter((q) => q.status !== "correct");
  // Xatolar bo'lsa — o'shalardan boshlanadi; hammasi to'g'ri bo'lsa
  // bo'sh ro'yxat ko'rsatmaslik uchun darhol "Hammasi"ga o'tiladi.
  const [filter, setFilter] = useState<Filter>(missed.length > 0 ? "missed" : "all");

  const visible = filter === "missed" ? missed : questions;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-text">Savollarni ko&apos;rib chiqish</p>
        <div
          role="tablist"
          aria-label="Ko'rinish"
          className="flex overflow-hidden rounded-md border border-border"
        >
          {(
            [
              ["missed", `Xato va javobsiz (${missed.length})`],
              ["all", `Hammasi (${questions.length})`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                filter === value
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
          Barcha savollarga to&apos;g&apos;ri javob berdingiz!
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-md border border-border">
          {visible.map((question) => (
            <div key={question.questionId} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-text">
                  <span className="font-mono text-text-muted">{question.order}.</span>{" "}
                  {question.text}
                </p>
                <span
                  className={cn(
                    "shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold",
                    STATUS_CLASS[question.status]
                  )}
                >
                  {STATUS_LABEL[question.status]}
                </span>
              </div>

              <p className="text-xs text-text-muted">{question.topicName}</p>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {question.status !== "correct" && (
                  <span className={question.status === "wrong" ? "text-danger" : "text-warning"}>
                    Sizning javobingiz:{" "}
                    {question.selectedOptionText ?? "Javob berilmagan"}
                  </span>
                )}
                <span className="text-success">
                  To&apos;g&apos;ri javob: {question.correctOptionText}
                </span>
              </div>

              {question.explanation && (
                <p className="text-xs leading-relaxed text-text-muted">
                  {question.explanation}
                </p>
              )}

              {/* Huquqiy asos alohida qatorda — ustoz o'quvchiga aynan shu
                  bandni ko'rsatib tushuntiradi. */}
              {question.legalReference && (
                <p className="text-xs font-medium text-brand">{question.legalReference}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
