"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { SelectField } from "@/components/Field";

export function NewQuestionModal({ topicId }: { topicId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctOptionIndex, setCorrectOptionIndex] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function close() {
    setOpen(false);
    setError(null);
  }

  function reset() {
    setText("");
    setOptions(["", "", "", ""]);
    setCorrectOptionIndex("0");
  }

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((option, i) => (i === index ? value : option)));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topicId,
        text,
        options,
        correctOptionIndex: Number(correctOptionIndex),
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }

    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        + Yangi savol
      </Button>

      <Modal open={open} onClose={close} title="Yangi savol qo'shish">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="space-y-1">
            <label htmlFor="question-text" className="text-sm font-medium text-text">
              Savol matni
            </label>
            <textarea
              id="question-text"
              required
              rows={3}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          {options.map((option, index) => (
            <div key={index} className="space-y-1">
              <label
                htmlFor={`question-option-${index}`}
                className="text-sm font-medium text-text"
              >
                {index + 1}-variant
              </label>
              <input
                id={`question-option-${index}`}
                required
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
              />
            </div>
          ))}

          <SelectField
            id="question-correct"
            label="To'g'ri javob"
            value={correctOptionIndex}
            onChange={(e) => setCorrectOptionIndex(e.target.value)}
          >
            <option value="0">1-variant</option>
            <option value="1">2-variant</option>
            <option value="2">3-variant</option>
            <option value="3">4-variant</option>
          </SelectField>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={close}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
