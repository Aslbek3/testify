"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { cn } from "@/lib/cn";
import type { ResumableAttempt } from "@/services/attempts";

const DANGER_THRESHOLD_SECONDS = 2 * 60;

type LocalAnswer = {
  selectedOptionIndex: number;
  isCorrect?: boolean;
  correctOptionIndex?: number;
  explanation?: string | null;
};

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function initialAnswersMap(attempt: ResumableAttempt): Record<string, LocalAnswer> {
  const map: Record<string, LocalAnswer> = {};
  for (const a of attempt.answers) {
    map[a.questionId] = {
      selectedOptionIndex: a.selectedOptionIndex,
      isCorrect: a.isCorrect,
      correctOptionIndex: a.correctOptionIndex,
      explanation: a.explanation,
    };
  }
  return map;
}

export function TestRunner({
  attempt,
  examDurationSeconds,
}: {
  attempt: ResumableAttempt;
  examDurationSeconds: number;
}) {
  const router = useRouter();
  const { questions, mode, attemptId } = attempt;

  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>(() =>
    initialAnswersMap(attempt)
  );
  const [currentIndex, setCurrentIndex] = useState(() => {
    const firstUnanswered = questions.findIndex((q) => !answers[q.id]);
    return firstUnanswered === -1 ? 0 : firstUnanswered;
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const finishTriggered = useRef(false);

  // Boshlang'ich qiymat DOIM statik (Date.now() ishlatilmaydi) — aks holda
  // server render qilgan payt bilan klient hidratsiya qilgan payt orasidagi
  // farq "hydration mismatch" xatosiga olib kelardi. Haqiqiy qolgan vaqt
  // pastdagi effekt ichida (faqat klientda) hisoblanadi.
  const [secondsLeft, setSecondsLeft] = useState<number | null>(
    mode === "EXAM" ? examDurationSeconds : null
  );

  const total = questions.length;
  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentQuestion.id];
  const isLast = currentIndex === total - 1;
  const practiceLocked = mode === "PRACTICE" && currentAnswer !== undefined;

  const handleFinish = useCallback(async () => {
    if (finishTriggered.current) return;
    finishTriggered.current = true;
    setFinishing(true);
    try {
      await fetch(`/api/attempts/${attemptId}/finish`, { method: "POST" });
    } finally {
      router.push(`/student/test/${attemptId}/natija`);
    }
  }, [attemptId, router]);

  // Taymer — faqat EXAM rejimida, faqat klientda ishga tushadi. Har soniya
  // absolyut vaqtdan (startedAt) qayta hisoblanadi — shunda brauzer
  // tabini fonga o'tkazib, taymerlar tormozlansa ham (throttling) haqiqiy
  // vaqtdan orqada qolib ketmaydi.
  useEffect(() => {
    if (mode !== "EXAM") return;

    function computeRemaining() {
      const elapsed = Math.floor(
        (Date.now() - new Date(attempt.startedAt).getTime()) / 1000
      );
      return Math.max(0, examDurationSeconds - elapsed);
    }

    setSecondsLeft(computeRemaining());
    const timer = setInterval(() => setSecondsLeft(computeRemaining()), 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Vaqt tugaganda avtomatik yakunlash.
  useEffect(() => {
    if (secondsLeft === 0) {
      handleFinish();
    }
  }, [secondsLeft, handleFinish]);

  async function handleSelect(optionIndex: number) {
    if (practiceLocked) return;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: { ...prev[currentQuestion.id], selectedOptionIndex: optionIndex },
    }));
    setSavingId(currentQuestion.id);

    try {
      const res = await fetch(`/api/attempts/${attemptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: currentQuestion.id, selectedOptionIndex: optionIndex }),
      });
      const data = await res.json();
      if (res.ok && data.mode === "PRACTICE") {
        setAnswers((prev) => ({
          ...prev,
          [currentQuestion.id]: {
            selectedOptionIndex: optionIndex,
            isCorrect: data.isCorrect,
            correctOptionIndex: data.correctOptionIndex,
            explanation: data.explanation,
          },
        }));
      } else if (res.status === 409) {
        // Server tomonda vaqt tugagan deb topildi (soat sinxronsizligi
        // kabi chekka holat) — mijoz taymeri buni allaqachon sezishi kerak
        // edi, shu bois to'g'ridan-to'g'ri yakunlashga o'tkazamiz.
        handleFinish();
      }
    } finally {
      setSavingId(null);
    }
  }

  const goNext = useCallback(() => {
    if (isLast) {
      handleFinish();
      return;
    }
    setCurrentIndex((i) => Math.min(i + 1, total - 1));
  }, [isLast, handleFinish, total]);

  const goBack = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  // Klaviatura: 1-4 variant tanlaydi, Enter keyingisiga o'tadi.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key >= "1" && event.key <= "4") {
        const idx = Number(event.key) - 1;
        if (idx < currentQuestion.options.length) {
          event.preventDefault();
          handleSelect(idx);
        }
      } else if (event.key === "Enter") {
        event.preventDefault();
        goNext();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion.id, practiceLocked, goNext]);

  const modeLabel = mode === "EXAM" ? "Imtihon rejimi" : "Mashq rejimi";
  const isDanger = secondsLeft !== null && secondsLeft <= DANGER_THRESHOLD_SECONDS;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-text-muted">{modeLabel}</p>
          <p className="font-mono text-lg font-semibold text-text">
            {currentIndex + 1} / {total}
          </p>
        </div>
        {secondsLeft !== null && (
          <div
            className={cn(
              "rounded-md border px-3 py-1.5 font-mono text-lg font-semibold",
              isDanger
                ? "border-danger/30 bg-danger/10 text-danger"
                : "border-border bg-bg text-text"
            )}
          >
            {formatTime(secondsLeft)}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Savollar holati">
        {questions.map((q, i) => {
          const isCurrent = i === currentIndex;
          const isAnswered = Boolean(answers[q.id]);
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrentIndex(i)}
              aria-label={`${i + 1}-savol${isAnswered ? ", javob berilgan" : ""}`}
              aria-current={isCurrent}
              className={cn(
                "h-2 min-w-[10px] flex-1 rounded-full transition-colors",
                isCurrent ? "bg-text" : isAnswered ? "bg-brand" : "bg-border"
              )}
            />
          );
        })}
      </div>

      <Card>
        {currentQuestion.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentQuestion.imageUrl}
            alt=""
            className="mb-4 max-h-64 w-full rounded-md object-contain"
          />
        )}
        <p className="text-lg font-medium leading-relaxed text-text">
          {currentQuestion.text}
        </p>

        <div className="mt-6 space-y-3">
          {currentQuestion.options.map((option, i) => {
            const isSelected = currentAnswer?.selectedOptionIndex === i;
            // `correctOptionIndex` faqat server javob qaytargandan keyin
            // keladi — shundan oldin ham "currentAnswer" mavjud bo'ladi
            // (optimistik selectedOptionIndex bilan), shuning uchun aynan
            // shu maydonni tekshiramiz, aks holda javob "xato" bo'lib bir
            // lahzaga miltillab ketardi.
            const showCorrectness =
              mode === "PRACTICE" && currentAnswer?.correctOptionIndex !== undefined;
            const isTheCorrectOne =
              showCorrectness && currentAnswer?.correctOptionIndex === i;
            const isWrongSelected = showCorrectness && isSelected && !isTheCorrectOne;

            return (
              <button
                key={i}
                type="button"
                disabled={practiceLocked}
                onClick={() => handleSelect(i)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                  isTheCorrectOne
                    ? "border-success bg-success/10"
                    : isWrongSelected
                      ? "border-danger bg-danger/10"
                      : isSelected
                        ? "border-brand bg-brand-soft"
                        : "border-border bg-bg hover:bg-bg-subtle",
                  practiceLocked && !isSelected && !isTheCorrectOne && "opacity-60"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-sm font-semibold",
                    isSelected || isTheCorrectOne
                      ? "border-transparent bg-brand text-white"
                      : "border-border text-text-muted"
                  )}
                >
                  {i + 1}
                </span>
                <span className="text-text">{option}</span>
              </button>
            );
          })}
        </div>

        {mode === "PRACTICE" && currentAnswer?.isCorrect !== undefined && (
          <div
            className={cn(
              "mt-4 rounded-md p-3 text-sm",
              currentAnswer.isCorrect ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
            )}
          >
            <p className="font-medium">
              {currentAnswer.isCorrect ? "To'g'ri!" : "Xato."}
            </p>
            {currentAnswer.explanation && (
              <p className="mt-1 text-text">{currentAnswer.explanation}</p>
            )}
          </div>
        )}

        {savingId === currentQuestion.id && (
          <p className="mt-2 text-xs text-text-muted">Saqlanmoqda...</p>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={goBack} disabled={currentIndex === 0}>
          Orqaga
        </Button>
        <Button onClick={goNext} disabled={finishing}>
          {finishing ? "Yakunlanmoqda..." : isLast ? "Yakunlash" : "Keyingisi"}
        </Button>
      </div>
    </div>
  );
}
