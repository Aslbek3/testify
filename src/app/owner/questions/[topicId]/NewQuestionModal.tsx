"use client";

import { useState, type FormEvent } from "react";
import { useRefresh } from "@/lib/useServerMutation";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import {
  QuestionFormFields,
  emptyQuestionForm,
  useQuestionForm,
} from "./QuestionFormFields";

export function NewQuestionModal({ topicId }: { topicId: string }) {
  const { refresh, refreshing } = useRefresh();
  const [open, setOpen] = useState(false);
  const questionForm = useQuestionForm(emptyQuestionForm());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // `refreshing` — sahifa yangilanishi tugagunicha tugma band qoladi.
  const busy = loading || refreshing;

  function close() {
    setOpen(false);
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId, ...questionForm.form }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }

    questionForm.reset(emptyQuestionForm());
    await refresh();
    setOpen(false);
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

          <QuestionFormFields idPrefix="question" {...questionForm} />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={close}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
