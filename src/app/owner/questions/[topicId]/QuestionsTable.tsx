"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/Table";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { optionLetter } from "@/lib/questionOptions";
import type { QuestionListItem } from "@/services/questions";
import { EditQuestionModal } from "./EditQuestionModal";

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function QuestionsTable({ questions }: { questions: QuestionListItem[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  const editingQuestion = questions.find((q) => q.id === editingId) ?? null;

  async function handleDelete(id: string) {
    setErrorById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setDeletingId(id);

    const res = await fetch(`/api/questions/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setDeletingId(null);

    if (!res.ok) {
      setErrorById((prev) => ({
        ...prev,
        [id]: data.error ?? "O'chirishda xatolik yuz berdi",
      }));
      return;
    }

    router.refresh();
  }

  if (questions.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        Bu mavzuda hozircha birorta savol qo&apos;shilmagan.
      </p>
    );
  }

  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Savol matni</TableHeaderCell>
            <TableHeaderCell>To&apos;g&apos;ri javob</TableHeaderCell>
            <TableHeaderCell>YHQ havolasi</TableHeaderCell>
            <TableHeaderCell align="right">Amallar</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {questions.map((question) => (
            <TableRow key={question.id}>
              <TableCell className="max-w-xs">{truncate(question.text, 80)}</TableCell>
              <TableCell className="max-w-xs">
                <span className="text-text-muted">
                  {optionLetter(question.correctOptionIndex)}.
                </span>{" "}
                {truncate(question.options[question.correctOptionIndex] ?? "", 60)}
              </TableCell>
              {/* Kontent sifati ko'rsatkichi: qonun bandiga havolasiz savollar
                  darhol ko'zga tashlansin — ustoz o'quvchiga asos ko'rsata
                  olishi uchun havola bo'lgani ma'qul. */}
              <TableCell className="max-w-xs">
                {question.legalReference ? (
                  truncate(question.legalReference, 40)
                ) : (
                  <Badge variant="warning">Havola yo&apos;q</Badge>
                )}
              </TableCell>
              <TableCell align="right">
                <div className="flex flex-col items-end gap-1">
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setEditingId(question.id)}
                    >
                      Tahrirlash
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={deletingId === question.id}
                      onClick={() => handleDelete(question.id)}
                    >
                      {deletingId === question.id ? "O'chirilmoqda..." : "O'chirish"}
                    </Button>
                  </div>
                  {errorById[question.id] && (
                    <p className="text-right text-sm text-danger">
                      {errorById[question.id]}
                    </p>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          open={editingId !== null}
          onClose={() => setEditingId(null)}
        />
      )}
    </>
  );
}
