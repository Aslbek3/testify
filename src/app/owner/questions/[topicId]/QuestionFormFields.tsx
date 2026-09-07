"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Field, SelectField } from "@/components/Field";
import { MIN_OPTIONS, MAX_OPTIONS, optionLetter } from "@/lib/questionOptions";

/**
 * "Yangi savol" va "Savolni tahrirlash" modallari uchun umumiy forma holati
 * va maydonlari. Ikkalasida bir xil bo'lgani uchun bitta joyda turadi —
 * variantlarni qo'shish/o'chirish mantig'i ikki nusxada yashamasin.
 */
export type QuestionFormState = {
  text: string;
  options: string[];
  correctOptionIndex: number;
  imageAlt: string;
  explanation: string;
  legalReference: string;
};

/** Yangi savol uchun bo'sh forma — standart 4 ta variant bilan boshlanadi. */
export function emptyQuestionForm(): QuestionFormState {
  return {
    text: "",
    options: ["", "", "", ""],
    correctOptionIndex: 0,
    imageAlt: "",
    explanation: "",
    legalReference: "",
  };
}

export function useQuestionForm(initial: QuestionFormState) {
  const [form, setForm] = useState<QuestionFormState>(initial);

  function setField<K extends keyof QuestionFormState>(
    key: K,
    value: QuestionFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setOption(index: number, value: string) {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((option, i) => (i === index ? value : option)),
    }));
  }

  function addOption() {
    setForm((prev) =>
      prev.options.length >= MAX_OPTIONS
        ? prev
        : { ...prev, options: [...prev.options, ""] }
    );
  }

  function removeOption(index: number) {
    setForm((prev) => {
      if (prev.options.length <= MIN_OPTIONS) return prev;

      const options = prev.options.filter((_, i) => i !== index);

      // To'g'ri javob indeksini siljitish — bu yerda xato qilinsa, savol
      // jimgina noto'g'ri javob bilan saqlanadi:
      //   - o'chirilgan variantdan KEYINGI javoblar bitta pastga suriladi;
      //   - o'chirilgani aynan to'g'ri javob bo'lsa, belgi o'sha o'rinda
      //     qolib, endi keyingi variantga tushadi (oxirgisi o'chirilgan
      //     bo'lsa — oxirgi qolganiga qisqartiriladi). Owner buni select'da
      //     darhol ko'radi va kerak bo'lsa qayta tanlaydi.
      let correctOptionIndex = prev.correctOptionIndex;
      if (index < correctOptionIndex) correctOptionIndex -= 1;
      if (correctOptionIndex > options.length - 1) {
        correctOptionIndex = options.length - 1;
      }

      return { ...prev, options, correctOptionIndex };
    });
  }

  function reset(next: QuestionFormState) {
    setForm(next);
  }

  return { form, setField, setOption, addOption, removeOption, reset };
}

export type QuestionFormHandlers = ReturnType<typeof useQuestionForm>;

function optionPreview(text: string, max = 40): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return trimmed.length > max ? ` — ${trimmed.slice(0, max)}...` : ` — ${trimmed}`;
}

const INPUT_CLASS =
  "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text";

export function QuestionFormFields({
  idPrefix,
  form,
  setField,
  setOption,
  addOption,
  removeOption,
}: { idPrefix: string } & QuestionFormHandlers) {
  const canAdd = form.options.length < MAX_OPTIONS;
  const canRemove = form.options.length > MIN_OPTIONS;

  return (
    <>
      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-text`} className="text-sm font-medium text-text">
          Savol matni
        </label>
        <textarea
          id={`${idPrefix}-text`}
          required
          rows={3}
          className={INPUT_CLASS}
          value={form.text}
          onChange={(e) => setField("text", e.target.value)}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text">Variantlar</span>
          <span className="text-xs text-text-muted">
            {MIN_OPTIONS}–{MAX_OPTIONS} ta
          </span>
        </div>

        {form.options.map((option, index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor={`${idPrefix}-option-${index}`}
                className="text-sm font-medium text-text"
              >
                {optionLetter(index)} varianti
              </label>
              <button
                type="button"
                disabled={!canRemove}
                onClick={() => removeOption(index)}
                className="text-xs font-medium text-text-muted hover:text-danger disabled:opacity-50 disabled:hover:text-text-muted"
              >
                O&apos;chirish
              </button>
            </div>
            <input
              id={`${idPrefix}-option-${index}`}
              required
              className={INPUT_CLASS}
              value={option}
              onChange={(e) => setOption(index, e.target.value)}
            />
          </div>
        ))}

        <Button type="button" variant="secondary" disabled={!canAdd} onClick={addOption}>
          + Variant qo&apos;shish
        </Button>
      </div>

      <SelectField
        id={`${idPrefix}-correct`}
        label="To'g'ri javob"
        value={String(form.correctOptionIndex)}
        onChange={(e) => setField("correctOptionIndex", Number(e.target.value))}
      >
        {form.options.map((option, index) => (
          <option key={index} value={String(index)}>
            {optionLetter(index)}
            {optionPreview(option)}
          </option>
        ))}
      </SelectField>

      {/* Izoh va YHQ havolasi yonma-yon turadi: ikkalasi ham "nega bu javob
          to'g'ri" degan savolga javob beradi — biri tushuntiradi, ikkinchisi
          huquqiy asosini ko'rsatadi. */}
      <div className="space-y-1">
        <label
          htmlFor={`${idPrefix}-explanation`}
          className="text-sm font-medium text-text"
        >
          Izoh (ixtiyoriy)
        </label>
        <textarea
          id={`${idPrefix}-explanation`}
          rows={3}
          className={INPUT_CLASS}
          placeholder="Nega aynan shu javob to'g'ri ekanini tushuntiring"
          value={form.explanation}
          onChange={(e) => setField("explanation", e.target.value)}
        />
        <p className="text-xs text-text-muted">
          Mashq rejimida javobdan keyin va natija sahifasida o&apos;quvchiga
          ko&apos;rsatiladi.
        </p>
      </div>

      <div className="space-y-1">
        <Field
          id={`${idPrefix}-legal-reference`}
          label="YHQ havolasi (ixtiyoriy)"
          placeholder="YHQ 21-bobi 128-bandiga asosan"
          value={form.legalReference}
          onChange={(e) => setField("legalReference", e.target.value)}
        />
        <p className="text-xs text-text-muted">
          Javobning huquqiy asosi — qonun bandi raqami. Ustoz o&apos;quvchiga
          &laquo;nega bu javob to&apos;g&apos;ri&raquo; deb tushuntirganda shu
          bandga ko&apos;rsatadi. Ixtiyoriy, bo&apos;sh qoldirilishi mumkin.
        </p>
      </div>

      <div className="space-y-1">
        <Field
          id={`${idPrefix}-image-alt`}
          label="Rasm tavsifi (ixtiyoriy)"
          placeholder="Masalan: To'rt tomonlama chorraha, chapdan tramvay yaqinlashmoqda"
          value={form.imageAlt}
          onChange={(e) => setField("imageAlt", e.target.value)}
        />
        <p className="text-xs text-text-muted">
          Savolga rasm biriktirilgan bo&apos;lsa, uning matnli tavsifi
          (ko&apos;rmaydigan foydalanuvchilar uchun).
        </p>
      </div>
    </>
  );
}
