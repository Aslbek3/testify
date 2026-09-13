"use client";

import { useState, type FormEvent } from "react";
import { useServerMutation } from "@/lib/useServerMutation";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Field, SelectField } from "@/components/Field";
import { ASSIGNMENT_MAX_TARGET, ASSIGNMENT_NOTE_MAX_LENGTH } from "@/lib/assignments";
import { QUESTION_COUNT } from "@/lib/examRules";

type Kind = "EXAM" | "PRACTICE";

/** Tur almashtirilganda taklif qilinadigan son — ustoz odatda shuncha so'raydi. */
const DEFAULT_COUNT: Record<Kind, number> = { EXAM: 2, PRACTICE: 3 };

export function NewAssignmentModal({
  groupId,
  groupName,
  topics,
  dueBounds,
}: {
  groupId: string;
  groupName: string;
  /** Faqat savoli bor mavzular — bo'sh mavzuni tanlab bo'lmasin. */
  topics: { id: string; name: string; questionCount: number }[];
  /** Serverda hisoblangan (`assignmentDueDateBounds`) — sabab o'sha yerda. */
  dueBounds: { min: string; max: string; defaultValue: string };
}) {
  const { run, pending, error, setError } = useServerMutation();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("EXAM");
  const [targetCount, setTargetCount] = useState(String(DEFAULT_COUNT.EXAM));
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState(dueBounds.defaultValue);
  const [note, setNote] = useState("");

  function reset() {
    setKind("EXAM");
    setTargetCount(String(DEFAULT_COUNT.EXAM));
    setTopicIds([]);
    setDueDate(dueBounds.defaultValue);
    setNote("");
    setError(null);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function changeKind(next: Kind) {
    setKind(next);
    setTargetCount(String(DEFAULT_COUNT[next]));
  }

  function toggleTopic(id: string) {
    setTopicIds((current) =>
      current.includes(id) ? current.filter((t) => t !== id) : [...current, id]
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // Mavzu tanlanmagani — yagona holat, uni brauzer o'zi (`required`)
    // tekshira olmaydi. Qolgan barcha qoidalar serverda.
    if (kind === "PRACTICE" && topicIds.length === 0) {
      setError("Kamida bitta mavzu tanlang");
      return;
    }
    const ok = await run(() =>
      fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          kind,
          topicIds: kind === "PRACTICE" ? topicIds : [],
          targetCount: Number(targetCount),
          dueDate,
          note,
        }),
      })
    );
    if (ok) close();
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        + Vazifa berish
      </Button>

      <Modal open={open} onClose={close} title={`Vazifa: ${groupName}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}

          <SelectField
            id="assignment-kind"
            label="Turi"
            value={kind}
            onChange={(e) => changeKind(e.target.value as Kind)}
          >
            <option value="EXAM">Imtihon topshirish</option>
            <option value="PRACTICE">Mavzu bo&apos;yicha mashq</option>
          </SelectField>

          <Field
            id="assignment-count"
            label={kind === "EXAM" ? "Nechta imtihon" : "Nechta mashq"}
            type="number"
            inputMode="numeric"
            required
            min={1}
            max={ASSIGNMENT_MAX_TARGET}
            value={targetCount}
            onChange={(e) => setTargetCount(e.target.value)}
          />

          {kind === "EXAM" ? (
            <p className="text-sm text-text-muted">
              Muddat ichida yakunlangan har qanday imtihon sanaladi — o&apos;quvchi
              uni &laquo;Imtihon&raquo; bo&apos;limidan boshlasa ham.
            </p>
          ) : (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-text">Mavzular</legend>
              <p className="text-sm text-text-muted">
                Har bir mashq {QUESTION_COUNT.PRACTICE} ta savoldan iborat, faqat
                tanlangan mavzulardan.
              </p>
              {topics.length === 0 ? (
                <p className="text-sm text-text-muted">Bazada savolli mavzu yo&apos;q.</p>
              ) : (
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                  {topics.map((topic) => (
                    <label
                      key={topic.id}
                      className="flex cursor-pointer items-center gap-3 rounded px-2 py-2 hover:bg-bg-subtle"
                    >
                      <input
                        type="checkbox"
                        checked={topicIds.includes(topic.id)}
                        onChange={() => toggleTopic(topic.id)}
                        className="h-4 w-4"
                      />
                      <span className="flex-1 text-sm text-text">{topic.name}</span>
                      <span className="font-mono text-sm tabular-nums text-text-muted">
                        {topic.questionCount}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          )}

          <Field
            id="assignment-due"
            label="Muddat (shu kun oxirigacha)"
            type="date"
            required
            min={dueBounds.min}
            max={dueBounds.max}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <div className="space-y-1">
            <label htmlFor="assignment-note" className="text-sm font-medium text-text">
              Izoh (ixtiyoriy)
            </label>
            <textarea
              id="assignment-note"
              rows={2}
              maxLength={ASSIGNMENT_NOTE_MAX_LENGTH}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={close}>
              Yopish
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saqlanmoqda..." : "Vazifa berish"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
