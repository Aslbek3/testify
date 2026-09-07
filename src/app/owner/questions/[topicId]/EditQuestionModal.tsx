"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import type { QuestionListItem } from "@/services/questions";
import { QuestionFormFields, useQuestionForm } from "./QuestionFormFields";

export function EditQuestionModal({
  question,
  open,
  onClose,
}: {
  question: QuestionListItem;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const questionForm = useQuestionForm({
    text: question.text,
    options: question.options,
    correctOptionIndex: question.correctOptionIndex,
    imageAlt: question.imageAlt ?? "",
    explanation: question.explanation ?? "",
    legalReference: question.legalReference ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function close() {
    setError(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/questions/${question.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(questionForm.form),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={close} title="Savolni tahrirlash">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <QuestionFormFields idPrefix="edit-question" {...questionForm} />

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
  );
}
