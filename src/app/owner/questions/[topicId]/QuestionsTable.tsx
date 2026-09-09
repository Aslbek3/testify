"use client";

import { useState } from "react";
import { useRefresh } from "@/lib/useServerMutation";
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
import type { QuestionListItem, QuestionQualityStat } from "@/services/questions";
import { EditQuestionModal } from "./EditQuestionModal";

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function QuestionsTable({
  questions,
  // Savol ID'si bo'yicha xato foizi. Bu yerda hisoblanmaydi, server
  // komponentidan tayyor holda keladi — `needsReview` va chegara qarorlari
  // ham service qatlamida (`SUSPICIOUS_WRONG_PERCENT`), shunda ustoz
  // paneli va owner paneli bir xil qoidaga bo'ysunadi.
  qualityByQuestionId,
}: {
  questions: QuestionListItem[];
  qualityByQuestionId: Record<string, QuestionQualityStat>;
}) {
  const { refresh, refreshing } = useRefresh();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  /**
   * Tugma jadval HAQIQATAN yangilangunicha band qoladi. Ilgari
   * `router.refresh()` bloklamagani uchun u darhol yoqilardi va o'chirilgan
   * savol yana bir necha soniya ro'yxatda turardi — foydalanuvchi
   * o'chirish ishlamadi deb o'ylardi.
   */
  const isDeleting = (id: string) => deletingId === id || refreshing;

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

    await refresh();
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
            <TableHeaderCell align="right">Xato foizi</TableHeaderCell>
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
              {/* Xato foizi — savolni tahrirlash tugmasi yonida turadi,
                  chunki qaror shu yerda qabul qilinadi: "80% xato — matnni
                  o'qib ko'ray". Javob berilmagan savolda "—", 5 tadan kam
                  javobda esa foiz so'nik rangda: raqam bor, lekin unga
                  tayanib savolni qayta yozish erta. */}
              <TableCell align="right">
                {(() => {
                  const quality = qualityByQuestionId[question.id];
                  if (!quality) {
                    return <span className="text-text-muted">—</span>;
                  }
                  return (
                    <div className="flex items-center justify-end gap-2">
                      {quality.needsReview && (
                        <Badge variant="danger">Tekshirish kerak</Badge>
                      )}
                      <span
                        className={
                          quality.hasEnoughData
                            ? "font-semibold text-text"
                            : "text-text-muted"
                        }
                        title={`${quality.answerCount} ta javob asosida`}
                      >
                        {quality.wrongPercent}%
                      </span>
                    </div>
                  );
                })()}
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
                      disabled={isDeleting(question.id)}
                      onClick={() => handleDelete(question.id)}
                    >
                      {isDeleting(question.id) ? "O'chirilmoqda..." : "O'chirish"}
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

      <p className="mt-3 text-sm text-text-muted">
        Xato foizi faqat yakunlangan imtihonlardagi javoblar bo&apos;yicha
        hisoblanadi (mashq rejimi sanalmaydi). So&apos;nik rangdagi foiz —
        javoblar hali kam, xulosa chiqarish erta; &quot;—&quot; esa savolga
        imtihonda hali javob berilmagan degani.
      </p>

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
