"use client";

import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { WarningIcon } from "./WarningIcon";

/**
 * Test ekranidagi ikkita oyna: "yakunlashni tasdiqlash" va "imtihon
 * to'xtatildi".
 *
 * `TestRunner.tsx` dan ajratilgan (2026-09-28): u 789 qatorga yetgan
 * edi va ichida uchta boshqa-boshqa ish bor edi — javob saqlash
 * mantiqi, taymer va ko'rinish.
 *
 * JSX bu yerga AYNAN ko'chirildi, qayta yozilmadi: oyna ichida
 * javobsiz va saqlanmagan savollarning bosiladigan raqamlari bor va
 * ularni "soddalashtirib" yozish jimgina xatti-harakat o'zgarishiga
 * olib kelardi. Yagona o'zgarish — `router.push` o'rniga `onSeeResult`
 * props'i: router asosiy komponentga tegishli.
 */
export function TestModals({
  showFinishConfirm,
  setShowFinishConfirm,
  unansweredQuestions,
  failedQuestions,
  setCurrentIndex,
  confirmFinish,
  retryAllFailed,
  finishing,
  stoppedWrongCount,
  mode,
  maxWrong,
  onSeeResult,
}: {
  showFinishConfirm: boolean;
  setShowFinishConfirm: (open: boolean) => void;
  /** Javobsiz qolgan savollar — `i` ularning ro'yxatdagi tartibi. */
  unansweredQuestions: { i: number }[];
  /** Saqlanmagan javoblar — tarmoq uzilgan savollar. */
  failedQuestions: { i: number }[];
  setCurrentIndex: (index: number) => void;
  confirmFinish: () => void;
  retryAllFailed: () => void;
  finishing: boolean;
  /** `null` — imtihon to'xtatilmagan. */
  stoppedWrongCount: number | null;
  /** Sarlavha rejimga qarab o'zgaradi: "Imtihonni" yoki "Mashqni". */
  mode: "EXAM" | "PRACTICE";
  maxWrong: number;
  onSeeResult: () => void;
}) {
  return (
    <>
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

  {/* Imtihon xatolar chegarasidan o'tib ketganda. Bekor qilish tugmasi
      YO'Q va oyna yopilmaydi: imtihon allaqachon tugagan, ortga yo'l
      yo'q — yagona harakat natijani ko'rish. */}
  <Modal
    open={stoppedWrongCount !== null}
    onClose={() => {}}
    title="Imtihon to'xtatildi"
  >
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-text">
        {stoppedWrongCount} ta xato qildingiz. Haqiqiy imtihon qoidasiga
        ko&apos;ra {maxWrong} tadan ortiq xatoga yo&apos;l
        qo&apos;yilmaydi, shuning uchun imtihon avtomatik yakunlandi.
      </p>
      <p className="text-xs leading-relaxed text-text-muted">
        Natija ekranida har bir savolning to&apos;g&apos;ri javobi va
        izohi ochiladi. Xatolaringiz &quot;Xatolarim&quot; bo&apos;limiga
        tushadi.
      </p>
      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={() => onSeeResult()}
          iconEnd="arrowRight"
        >
          Natijani ko&apos;rish
        </Button>
      </div>
    </div>
  </Modal>
    </>
  );
}
