"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { QuestionImage } from "@/components/QuestionImage";
import { optionLetter } from "@/lib/questionOptions";
import { cn } from "@/lib/cn";
import type { ResumableAttempt } from "@/services/attempts";

const DANGER_THRESHOLD_SECONDS = 2 * 60;

/**
 * Shundan ko'p savolda yuqoridagi chiziqchalar o'rniga oddiy progress
 * ko'rsatiladi. Maratonda 200 tagacha savol bo'lishi mumkin — o'shanda har
 * bir chiziqcha 2 pikseldan kam bo'lib, na ko'rinadi, na bosiladi.
 */
const MAX_PROGRESS_DOTS = 30;

type LocalAnswer = {
  selectedOptionIndex: number;
  isCorrect?: boolean;
  correctOptionIndex?: number;
  explanation?: string | null;
  legalReference?: string | null;
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
      legalReference: a.legalReference,
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
  const answeredCount = questions.filter((q) => answers[q.id]).length;
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

    // Qolgan vaqt `Date.now()` dan hisoblanadi va uni render paytida o'qib
    // bo'lmaydi: server bilan klient turli lahzada hisoblab, hidratsiya
    // nomuvofiqligini beradi. Shuning uchun boshlang'ich qiymat statik,
    // haqiqiysi esa faqat klientda, effekt ichida qo'yiladi — bu aynan
    // qoida istisno qiladigan "tashqi manba bilan sinxronlash" holati.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        if (mode === "EXAM") {
          // Server tomonda vaqt tugagan deb topildi (soat sinxronsizligi
          // kabi chekka holat) — mijoz taymeri buni allaqachon sezishi kerak
          // edi, shu bois to'g'ridan-to'g'ri yakunlashga o'tkazamiz.
          handleFinish();
          return;
        }
        // MASHQDA 409 boshqa narsani bildiradi: "javob allaqachon berilgan".
        // Bu yerda testni yakunlash mumkin emas edi — server javobni qayta
        // yozishdan himoyalangani uchun bu holat endi normal javob, xato
        // emas. Amalda bunga yetib kelinmaydi (variantlar javobdan keyin
        // bloklanadi), lekin yetib kelinsa test tugab qolmasligi shart.
        setSaveStatus((prev) => {
          const next = { ...prev };
          delete next[questionId];
          return next;
        });
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
            legalReference: data.legalReference,
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

  // Klaviatura: raqamlar variant tanlaydi, ←/→ savollar orasida yuradi,
  // Enter keyingisiga o'tadi. Tasdiqlash modali ochiq bo'lsa hech narsa
  // qilmaydi — aks holda fonda javob o'zgarib ketishi yoki modal qayta
  // ochilib ketishi mumkin edi.
  //
  // Raqamlar chegarasi AYNI savoldagi variantlar soniga bog'liq: qattiq
  // `1`–`4` oralig'i 5 variantli savolda oxirgi variantni tanlab
  // bo'lmaydigan qilib qo'yardi.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (showFinishConfirm) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      // Modifikator bilan bosilgan klavish — bu brauzer yorlig'i, javob emas.
      // Ilgari Ctrl+1 (yorliqlar orasida o'tish) A variantini tanlab qo'yardi,
      // Alt+→ (brauzerda "oldinga") esa keyingi savolga o'tkazardi. Mashqda
      // javob berilgandan keyin uni o'zgartirib bo'lmaydi — ya'ni tasodifan
      // bosilgan Ctrl+1 savolni butunlay kuydirib yuborardi.
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const digit = Number(event.key);
      if (Number.isInteger(digit) && digit >= 1 && digit <= currentQuestion.options.length) {
        event.preventDefault();
        handleSelect(digit - 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goBack();
      } else if (event.key === "ArrowRight" || event.key === "Enter") {
        event.preventDefault();
        goNext();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion.id, practiceLocked, goNext, goBack, showFinishConfirm]);

  const modeLabel = mode === "EXAM" ? "Imtihon" : "Mashq";
  const isDanger = secondsLeft !== null && secondsLeft <= DANGER_THRESHOLD_SECONDS;
  const currentStatus = saveStatus[currentQuestion.id];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold",
                mode === "EXAM" ? "bg-brand-soft text-brand" : "bg-success/15 text-success"
              )}
            >
              {modeLabel}
            </span>
            <span className="font-mono text-base font-semibold text-text">
              {currentIndex + 1} / {total}
            </span>
          </div>
          {secondsLeft !== null ? (
            <span
              className={cn(
                "font-mono text-base font-semibold",
                isDanger ? "text-danger" : "text-text"
              )}
            >
              {formatTime(secondsLeft)}
            </span>
          ) : (
            <span className="font-mono text-base font-semibold text-text-muted">
              Cheklovsiz
            </span>
          )}
        </div>

        {/* Maratonda savollar soni 200 tagacha bo'lishi mumkin — o'shanda
            har bir chiziqcha 2 pikseldan kam bo'lib, na ko'rinadi, na
            bosiladi. Ko'p savolda chiziqchalar o'rniga oddiy progress
            ko'rsatiladi. */}
        {total > MAX_PROGRESS_DOTS ? (
          <div className="border-b border-border px-5 py-3.5 sm:px-6">
            <div className="h-1.5 rounded-full bg-bg-subtle">
              <div
                className="h-1.5 rounded-full bg-brand transition-all"
                style={{ width: `${Math.round((answeredCount / total) * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-text-muted">
              {total} tadan {answeredCount} tasiga javob berildi
            </p>
          </div>
        ) : (
        <nav
          className="flex gap-1 border-b border-border px-5 py-3.5 sm:px-6"
          aria-label="Savollar holati"
        >
          {questions.map((q, i) => {
            const isCurrent = i === currentIndex;
            const answer = answers[q.id];
            const isAnswered = Boolean(answer);
            const status = saveStatus[q.id];

            // MASHQDA chiziqcha javob to'g'ri-noto'g'riligini ko'rsatadi:
            // yashil/qizil. Mashqda to'g'ri javob allaqachon ekranda ochilgan,
            // shuning uchun yashirishning ma'nosi yo'q — aksincha, o'quvchi
            // butun test bo'ylab qayerda qoqilganini bir qarashda ko'radi.
            //
            // IMTIHONDA esa faqat "javob berilgan/berilmagan" ko'rinadi (ko'k):
            // u yerda to'g'ri javob yakunlanmaguncha hech qanday yo'l bilan
            // oshkor qilinmasligi kerak, chiziqcha rangi ham shunga kiradi.
            // `correctOptionIndex` faqat mashqda serverdan keladi, ya'ni bu
            // shart imtihonda hech qachon bajarilmaydi.
            const knowsCorrectness =
              mode === "PRACTICE" && answer?.correctOptionIndex !== undefined;

            const fillColor =
              // Saqlanmagan javob birinchi o'rinda — u boshqa hamma narsadan
              // muhimroq signal (javob yo'qolgan bo'lishi mumkin).
              status === "failed"
                ? "bg-danger"
                : status === "retrying" || status === "saving"
                  ? "bg-warning"
                  : knowsCorrectness
                    ? answer?.isCorrect
                      ? "bg-success"
                      : "bg-danger"
                    : isAnswered
                      ? "bg-brand"
                      : "bg-border";

            const answerLabel = knowsCorrectness
              ? answer?.isCorrect
                ? ", to'g'ri"
                : ", xato"
              : isAnswered
                ? ", javob berilgan"
                : "";

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentIndex(i)}
                aria-label={`${i + 1}-savol${answerLabel}${
                  status === "failed" ? ", saqlanmadi" : ""
                }`}
                aria-current={isCurrent ? "step" : undefined}
                // Mobilda bosish maydoni balandroq: 390px ekranda 20 ta chiziqcha
                // ~13px kenglikda qoladi va 24px balandlikdagi nishonga barmoq
                // bilan tegish qiyin. Ko'rinadigan chiziqcha o'zgarmaydi —
                // faqat uni o'rab turgan tugma balandlashadi.
                className="flex min-h-[44px] min-w-[10px] flex-1 items-center rounded-full pointer-fine:min-h-[24px]"
              >
                <span
                  className={cn(
                    "block w-full rounded-full transition-all",
                    isCurrent ? "h-2 border-2 border-text" : "h-1.5",
                    fillColor
                  )}
                />
              </button>
            );
          })}
        </nav>
        )}

        <div
          className={cn(
            "gap-6 p-5 sm:p-6 md:p-8",
            currentQuestion.imageUrl
              ? "grid md:grid-cols-[minmax(0,420px)_1fr] md:gap-8"
              : "flex flex-col"
          )}
        >
          {currentQuestion.imageUrl && (
            <QuestionImage
              src={currentQuestion.imageUrl}
              alt={currentQuestion.imageAlt}
              className="h-56 w-full md:h-[280px]"
            />
          )}

          <div className="flex flex-col gap-5">
            <p className="text-lg font-semibold leading-relaxed text-text">
              {currentQuestion.text}
            </p>

            {currentStatus === "retrying" && (
              <p className="flex items-center gap-1.5 rounded-md border border-warning bg-warning/10 px-4 py-3 text-sm text-warning">
                <WarningIcon className="h-4 w-4 shrink-0" />
                Saqlanmadi, qayta urinilmoqda...
              </p>
            )}
            {currentStatus === "failed" && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger bg-danger/10 px-4 py-3">
                <p className="text-sm text-danger">
                  Javobingiz saqlanmadi — internet aloqasi uzilgan bo&apos;lishi
                  mumkin.
                </p>
                <button
                  type="button"
                  onClick={() => retrySave(currentQuestion.id)}
                  className="shrink-0 rounded-md bg-danger px-3.5 py-1.5 text-xs font-semibold text-white"
                >
                  Qayta urinish
                </button>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              {currentQuestion.options.map((option, i) => {
                const isSelected = currentAnswer?.selectedOptionIndex === i;
                const showUnsaved =
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
                      "flex w-full items-center gap-3 rounded-lg border p-3.5 text-left transition-colors",
                      isTheCorrectOne
                        ? "border-success bg-success/10"
                        : isWrongSelected
                          ? "border-danger bg-danger/10"
                          : showUnsaved
                            ? cn(
                                "border-dashed",
                                currentStatus === "failed" ? "border-danger" : "border-warning"
                              )
                            : isSelected
                              ? "border-brand bg-brand-soft"
                              : "border-border bg-bg hover:bg-bg-subtle",
                      practiceLocked && !isSelected && !isTheCorrectOne && "opacity-50"
                    )}
                  >
                    <span
                      className={cn(
                        "w-4 shrink-0 font-mono text-sm font-semibold",
                        isTheCorrectOne
                          ? "text-success"
                          : showUnsaved
                            ? currentStatus === "failed"
                              ? "text-danger"
                              : "text-warning"
                            : "text-text-muted"
                      )}
                    >
                      {optionLetter(i)}
                    </span>
                    <span
                      className={cn(
                        "text-sm text-text",
                        (isSelected || isTheCorrectOne) && "font-medium"
                      )}
                    >
                      {option}
                    </span>
                    {isTheCorrectOne && (
                      <span className="ml-auto text-sm font-semibold text-success">✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {mode === "PRACTICE" &&
              (currentAnswer?.explanation || currentAnswer?.legalReference) && (
                <div className="flex flex-col gap-1 rounded-md bg-brand-soft px-4 py-3.5">
                  <p className="text-xs font-semibold text-brand">Izoh</p>
                  {currentAnswer.explanation && (
                    <p className="text-sm leading-relaxed text-text">
                      {currentAnswer.explanation}
                    </p>
                  )}
                  {currentAnswer.legalReference && (
                    <p className="text-xs text-text-muted">
                      {currentAnswer.legalReference}
                    </p>
                  )}
                </div>
              )}

            {currentStatus === "saving" && (
              <p className="text-xs text-text-muted">Saqlanmoqda...</p>
            )}

            <div className="mt-1 flex items-center justify-between">
              <Button variant="secondary" onClick={goBack} disabled={currentIndex === 0}>
                Orqaga
              </Button>
              <Button onClick={goNext} disabled={finishing}>
                {finishing ? "Yakunlanmoqda..." : isLast ? "Yakunlash" : "Keyingisi"}
              </Button>
            </div>

            {/* Klaviatura allaqachon ishlardi, lekin bu haqda hech qayerda
                yozilmagani uchun deyarli hech kim ishlatmasdi. Raqamlar
                oralig'i shu savoldagi variantlar soniga qarab yoziladi —
                4 ta variant bo'lsa "1–4", 2 ta bo'lsa "1–2". */}
            <p className="hidden text-xs text-text-muted sm:block">
              <span className="font-mono">←</span> oldingi ·{" "}
              <span className="font-mono">→</span> keyingi ·{" "}
              <span className="font-mono">
                {currentQuestion.options.length > 1
                  ? `1–${currentQuestion.options.length}`
                  : "1"}
              </span>{" "}
              javob tanlash
            </p>
          </div>
        </div>
      </Card>

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
