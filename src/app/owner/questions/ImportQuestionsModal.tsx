"use client";

import { useState, type FormEvent } from "react";
import { useServerMutation } from "@/lib/useServerMutation";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { MAX_IMPORT_QUESTIONS } from "@/lib/questionImport";

type ImportResult = {
  created: number;
  skipped: number;
  createdTopics: string[];
  errors: { row: number; message: string }[];
};

const EXAMPLE = `[
  {
    "topic": "Yo'l belgilari",
    "text": "Ushbu belgi nimani bildiradi?",
    "options": ["To'xtash taqiqlanadi", "Turish taqiqlanadi", "Yo'l berish"],
    "correctOptionIndex": 0,
    "explanation": "Belgi harakatlanishni emas, to'xtashni taqiqlaydi.",
    "legalReference": "YHQ 1-ilova 3.27"
  }
]`;

/**
 * Savollarni ro'yxat ko'rinishida (JSON) kiritish.
 *
 * Nega JSON: savolda massiv (variantlar) va to'g'ri javob raqami bor —
 * jadval formatida ular ustunlarga yoyilib, chalkashadi. JSON'ni esa
 * istalgan skript yoki jadval dasturi aniq chiqarib beradi.
 *
 * Xato bo'lsa HECH NARSA yozilmaydi va qator raqami ko'rsatiladi: yarim
 * import — eng yomon holat, keyin qaysi savol kirganini qo'lda aniqlashga
 * to'g'ri kelardi.
 */
export function ImportQuestionsModal() {
  const { run, pending, error, setError } = useServerMutation();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  function close() {
    setOpen(false);
    setValue("");
    setResult(null);
    setError(null);
  }

  async function handleFile(file: File) {
    setResult(null);
    setError(null);
    setValue(await file.text());
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setResult(null);

    let questions: unknown;
    try {
      questions = JSON.parse(value);
    } catch {
      setError("JSON o'qilmadi — qavslar va vergullarni tekshiring");
      return;
    }

    let payload: ImportResult | null = null;
    const ok = await run(async () => {
      const res = await fetch("/api/questions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions }),
      });
      payload = await res
        .clone()
        .json()
        .catch(() => null);
      return res;
    });

    // Xatolar ro'yxati 400 bilan qaytadi — uni ham ko'rsatamiz.
    if (payload && "errors" in payload) setResult(payload);
    if (ok && payload) setValue("");
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Savollarni import qilish
      </Button>

      <Modal open={open} onClose={close} title="Savollarni import qilish">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}

          {result && result.errors.length === 0 && (
            <div className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
              <p>
                {result.created} ta savol qo&apos;shildi
                {result.skipped > 0 && `, ${result.skipped} tasi takror bo'lgani uchun o'tkazib yuborildi`}
                .
              </p>
              {result.createdTopics.length > 0 && (
                <p className="mt-1">
                  Yangi mavzu ochildi: {result.createdTopics.join(", ")}
                </p>
              )}
            </div>
          )}

          {result && result.errors.length > 0 && (
            <div className="space-y-1 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              <p className="font-medium">
                Hech narsa yozilmadi — {result.errors.length} ta qatorda xato:
              </p>
              <ul className="list-inside list-disc">
                {result.errors.slice(0, 10).map((item) => (
                  <li key={item.row}>
                    {item.row}-qator: {item.message}
                  </li>
                ))}
              </ul>
              {result.errors.length > 10 && <p>...va yana {result.errors.length - 10} ta</p>}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="import-file" className="text-sm font-medium text-text">
              JSON fayl
            </label>
            <input
              id="import-file"
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void handleFile(file);
              }}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="import-json" className="text-sm font-medium text-text">
              Yoki ro&apos;yxatni shu yerga qo&apos;ying
            </label>
            <textarea
              id="import-json"
              rows={10}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={EXAMPLE}
              spellCheck={false}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 font-mono text-xs text-text"
            />
            <p className="text-xs text-text-muted">
              Bir urinishda {MAX_IMPORT_QUESTIONS} tagacha savol. Mavzu nomi
              bo&apos;yicha topiladi, yo&apos;q bo&apos;lsa ochiladi. Shu
              mavzuda ayni matnli savol bo&apos;lsa — o&apos;tkazib yuboriladi,
              ya&apos;ni ro&apos;yxatni qayta yuborish xavfsiz.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={close}>
              Yopish
            </Button>
            <Button type="submit" disabled={pending || !value.trim()}>
              {pending ? "Yuklanmoqda..." : "Import qilish"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
