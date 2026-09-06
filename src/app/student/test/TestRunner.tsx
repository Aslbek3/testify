"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { cn } from "@/lib/cn";
import type { ResumableAttempt } from "@/services/attempts";

const DANGER_THRESHOLD_SECONDS = 2 * 60;

type LocalAnswer = {
  selectedOptionIndex: number;
  isCorrect?: boolean;
  correctOptionIndex?: number;
  explanation?: string | null;
};

type SaveStatus = "saving" | "retrying" | "failed";

/** 1s, so'ng 3s dan keyin avtomatik qayta urinish — shundan keyin ham
 * muvaffaqiyatsiz bo'lsa, foydalanuvchiga qo'lda "Qayta urinish" ko'rsatiladi. */
const RETRY_DELAYS_MS = [1000, 3000];

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 2.5 1.5 17h17L10 2.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M10 8v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="10" cy="14.3" r="0.9" fill="currentColor" />
    </svg>
  );
}

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
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});
  const [finishing, setFinishing] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const finishTriggered = useRef(false);
  // Har bir savol uchun so'nggi so'ralgan variant — eski (allaqachon
  // ustidan bosilgan) qayta urinish javobi kelib qolsa, uni e'tiborsiz
  // qoldirish uchun solishtiriladi.
  const latestSelectionRef = useRef<Record<string, number>>({});

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
  const unansweredQuestions = questions
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => !answers[q.id]);
  const failedQuestions = questions
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => saveStatus[q.id] === "failed");

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

  async function saveAnswer(questionId: string, optionIndex: number, attemptNumber = 0) {
    // Shu orada foydalanuvchi boshqa variantni bosib ulgurgan bo'lsa, bu
    // (eski) urinish natijasi e'tiborsiz qoldiriladi.
    if (latestSelectionRef.current[questionId] !== optionIndex) return;

    setSaveStatus((prev) => ({
      ...prev,
      [questionId]: attemptNumber === 0 ? "saving" : "retrying",
    }));

    try {
      const res = await fetch(`/api/attempts/${attemptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, selectedOptionIndex: optionIndex }),
      });

      if (res.status === 409) {
        // Server tomonda vaqt tugagan deb topildi (soat sinxronsizligi
        // kabi chekka holat) — mijoz taymeri buni allaqachon sezishi kerak
        // edi, shu bois to'g'ridan-to'g'ri yakunlashga o'tkazamiz.
        handleFinish();
        return;
      }
      if (!res.ok) throw new Error(`saqlash muvaffaqiyatsiz: ${res.status}`);

      const data = await res.json();
      if (latestSelectionRef.current[questionId] !== optionIndex) return;

      if (data.mode === "PRACTICE") {
        setAnswers((prev) => ({
          ...prev,
          [questionId]: {
            selectedOptionIndex: optionIndex,
            isCorrect: data.isCorrect,
            correctOptionIndex: data.correctOptionIndex,
            explanation: data.explanation,
          },
        }));
      }
      setSaveStatus((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    } catch {
      if (latestSelectionRef.current[questionId] !== optionIndex) return;

      if (attemptNumber < RETRY_DELAYS_MS.length) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attemptNumber]));
        saveAnswer(questionId, optionIndex, attemptNumber + 1);
      } else {
        setSaveStatus((prev) => ({ ...prev, [questionId]: "failed" }));
      }
    }
  }

  function handleSelect(optionIndex: number) {
    if (practiceLocked) return;

    const questionId = currentQuestion.id;
    latestSelectionRef.current[questionId] = optionIndex;

    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], selectedOptionIndex: optionIndex },
    }));

    saveAnswer(questionId, optionIndex);
  }

  const goNext = useCallback(() => {
    if (isLast) {
      // To'g'ridan-to'g'ri yakunlanmaydi — chunki qaytarib bo'lmaydi.
      // Avval tasdiqlash modali ko'rsatiladi (pastdagi confirmFinish orqali).
      setShowFinishConfirm(true);
      return;
    }
    setCurrentIndex((i) => Math.min(i + 1, total - 1));
  }, [isLast, total]);

  const confirmFinish = useCallback(() => {
    setShowFinishConfirm(false);
    handleFinish();
  }, [handleFinish]);

  const goBack = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  function retrySave(questionId: string) {
    const optionIndex = answers[questionId]?.selectedOptionIndex;
    if (optionIndex === undefined) return;
    latestSelectionRef.current[questionId] = optionIndex;
    saveAnswer(questionId, optionIndex);
  }

  function retryAllFailed() {
    for (const { q } of failedQuestions) {
      retrySave(q.id);
    }
  }

  // Klaviatura: 1-4 variant tanlaydi, Enter keyingisiga o'tadi. Tasdiqlash
  // modali ochiq bo'lsa hech narsa qilmaydi — aks holda fonda javob
  // o'zgarib ketishi yoki modal qayta ochilib ketishi mumkin edi.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (showFinishConfirm) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
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
  }, [currentQuestion.id, practiceLocked, goNext, showFinishConfirm]);

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

      <nav className="flex flex-wrap gap-1.5" aria-label="Savollar holati">
        {questions.map((q, i) => {
          const isCurrent = i === currentIndex;
          const isAnswered = Boolean(answers[q.id]);
          const status = saveStatus[q.id];
          const barColor = isCurrent
            ? "bg-text"
            : status === "failed"
              ? "bg-danger"
              : status === "retrying" || status === "saving"
                ? "bg-warning"
                : isAnswered
                  ? "bg-brand"
                  : "bg-border";
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrentIndex(i)}
              aria-label={`${i + 1}-savol${isAnswered ? ", javob berilgan" : ""}${
                status === "failed" ? ", saqlanmadi" : ""
              }`}
              aria-current={isCurrent ? "step" : undefined}
              className="flex min-h-[24px] min-w-[10px] flex-1 items-center rounded-full"
            >
              <span className={cn("block h-2 w-full rounded-full transition-colors", barColor)} />
            </button>
          );
        })}
      </nav>

      <Card>
        {currentQuestion.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentQuestion.imageUrl}
            alt={currentQuestion.imageAlt ?? ""}
            className="mb-4 max-h-64 w-full rounded-md object-contain"
          />
        )}
        <p className="text-lg font-medium leading-relaxed text-text">
          {currentQuestion.text}
        </p>

        <div className="mt-6 space-y-3">
          {currentQuestion.options.map((option, i) => {
            const isSelected = currentAnswer?.selectedOptionIndex === i;
            const currentStatus = saveStatus[currentQuestion.id];
            const showUnsavedWarning =
              isSelected && (currentStatus === "retrying" || currentStatus === "failed");
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
                {showUnsavedWarning && (
                  <WarningIcon
                    className={cn(
                      "ml-auto h-4 w-4 shrink-0",
                      currentStatus === "failed" ? "text-danger" : "text-warning"
                    )}
                  />
                )}
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

        {saveStatus[currentQuestion.id] === "saving" && (
          <p className="mt-2 text-xs text-text-muted">Saqlanmoqda...</p>
        )}
        {saveStatus[currentQuestion.id] === "retrying" && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-warning">
            <WarningIcon className="h-3.5 w-3.5" />
            Saqlanmadi, qayta urinilmoqda...
          </p>
        )}
        {saveStatus[currentQuestion.id] === "failed" && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-danger">
            <WarningIcon className="h-3.5 w-3.5" />
            <span>Javobingiz saqlanmadi. Internet aloqasini tekshiring.</span>
            <button
              type="button"
              onClick={() => retrySave(currentQuestion.id)}
              className="font-medium underline"
            >
              Qayta urinish
            </button>
          </div>
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

      <Modal
        open={showFinishConfirm}
        onClose={() => setShowFinishConfirm(false)}
        title={mode === "EXAM" ? "Imtihonni yakunlash" : "Mashqni yakunlash"}
      >
        <div className="space-y-4">
          {unansweredQuestions.length > 0 && (
            <div>
              <p className="text-sm text-text">
                {unansweredQuestions.length} ta savol javobsiz qoldi.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {unansweredQuestions.map(({ i }) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(i);
                      setShowFinishConfirm(false);
                    }}
                    className="rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-bg-subtle"
                  >
                    {i + 1}-savol
                  </button>
                ))}
              </div>
            </div>
          )}

          {failedQuestions.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-sm text-danger">
                <WarningIcon className="h-4 w-4 shrink-0" />
                {failedQuestions.length} ta javob saqlanmadi.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {failedQuestions.map(({ i }) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(i);
                      setShowFinishConfirm(false);
                    }}
                    className="rounded-md border border-danger/30 bg-danger/10 px-3 py-1.5 text-sm text-danger hover:bg-danger/20"
                  >
                    {i + 1}-savol
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={retryAllFailed}
                className="mt-2 text-sm font-medium text-brand underline"
              >
                Hammasini qayta saqlash
              </button>
            </div>
          )}

          {unansweredQuestions.length === 0 && failedQuestions.length === 0 && (
            <p className="text-sm text-text">Barcha savollarga javob berdingiz.</p>
          )}

          {failedQuestions.length > 0 && (
            <p className="text-xs text-text-muted">
              Diqqat: saqlanmagan javoblar hisobga olinmaydi — ular javobsiz
              deb belgilanadi.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowFinishConfirm(false)}>
              Bekor qilish
            </Button>
            <Button type="button" onClick={confirmFinish} disabled={finishing}>
              {finishing
                ? "Yakunlanmoqda..."
                : failedQuestions.length > 0
                  ? "Baribir yakunlash"
                  : "Ha, yakunlash"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
