"use client";

import { useState } from "react";
import { useServerMutation } from "@/lib/useServerMutation";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Badge, type BadgeVariant } from "@/components/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/Table";

/**
 * Klientga beriladigan, allaqachon formatlangan vazifa. Sana va "necha
 * kun qoldi" SERVERDA hisoblanadi (`GroupAssignmentsCard`) — brauzer
 * vaqti bilan hisoblansa hidratsiya xatosi chiqardi (`lib/format.ts`).
 */
export type AssignmentListItem = {
  id: string;
  title: string;
  note: string | null;
  dueDate: string;
  due: { label: string; variant: BadgeVariant };
  targetCount: number;
  completedCount: number;
  students: { studentId: string; name: string; doneCount: number; isDone: boolean }[];
};

export function AssignmentList({
  items,
  canManage,
}: {
  items: AssignmentListItem[];
  canManage: boolean;
}) {
  const [detailsFor, setDetailsFor] = useState<AssignmentListItem | null>(null);
  const [deleteFor, setDeleteFor] = useState<AssignmentListItem | null>(null);

  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Vazifa</TableHeaderCell>
            <TableHeaderCell>Muddat</TableHeaderCell>
            <TableHeaderCell>Bajardi</TableHeaderCell>
            <TableHeaderCell align="right">
              <span className="sr-only">Amallar</span>
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <p className="font-medium text-text">{item.title}</p>
                {item.note && <p className="mt-0.5 text-sm text-text-muted">{item.note}</p>}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono tabular-nums">{item.dueDate}</span>
                  <Badge variant={item.due.variant}>{item.due.label}</Badge>
                </div>
              </TableCell>
              <TableCell>
                <CompletionBar done={item.completedCount} total={item.students.length} />
              </TableCell>
              <TableCell align="right">
                <div className="flex justify-end gap-2 font-sans">
                  <Button type="button" variant="secondary" onClick={() => setDetailsFor(item)}>
                    Kim bajardi
                  </Button>
                  {canManage && (
                    <Button type="button" variant="secondary" onClick={() => setDeleteFor(item)}>
                      O&apos;chirish
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {detailsFor && (
        <AssignmentDetailsModal item={detailsFor} onClose={() => setDetailsFor(null)} />
      )}
      {deleteFor && (
        <DeleteAssignmentModal item={deleteFor} onClose={() => setDeleteFor(null)} />
      )}
    </>
  );
}

function CompletionBar({ done, total }: { done: number; total: number }) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 font-mono tabular-nums">
        {done} / {total}
      </span>
      <div className="h-2 w-24 rounded-full bg-bg-subtle">
        <div className="h-2 rounded-full bg-success" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function AssignmentDetailsModal({
  item,
  onClose,
}: {
  item: AssignmentListItem;
  onClose: () => void;
}) {
  // Bajarmaganlar tepada — ustoz aynan kimga eslatish kerakligini
  // qidirib o'tirmasin.
  const students = [...item.students].sort(
    (a, b) => Number(a.isDone) - Number(b.isDone) || a.name.localeCompare(b.name)
  );

  return (
    <Modal open onClose={onClose} title={item.title}>
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          Muddat: <span className="font-mono tabular-nums text-text">{item.dueDate}</span> ·{" "}
          {item.completedCount} / {item.students.length} o&apos;quvchi bajardi
        </p>
        {students.length === 0 ? (
          <p className="text-sm text-text-muted">Guruhda faol o&apos;quvchi yo&apos;q.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {students.map((s) => (
              <li key={s.studentId} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="truncate text-sm text-text">{s.name}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-sm tabular-nums text-text-muted">
                    {s.doneCount} / {item.targetCount}
                  </span>
                  <Badge variant={s.isDone ? "success" : s.doneCount > 0 ? "warning" : "neutral"}>
                    {s.isDone ? "Bajardi" : s.doneCount > 0 ? "Jarayonda" : "Boshlamagan"}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Yopish
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function DeleteAssignmentModal({
  item,
  onClose,
}: {
  item: AssignmentListItem;
  onClose: () => void;
}) {
  const { run, pending, error } = useServerMutation();

  async function handleDelete() {
    const ok = await run(() => fetch(`/api/assignments/${item.id}`, { method: "DELETE" }));
    if (ok) onClose();
  }

  return (
    <Modal open onClose={onClose} title="Vazifani o'chirish">
      <div className="space-y-4">
        {error && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}
        <p className="text-sm text-text">
          &laquo;{item.title}&raquo; vazifasi o&apos;quvchilar ro&apos;yxatidan
          olib tashlanadi. O&apos;quvchilarning test natijalari o&apos;chmaydi.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="button" disabled={pending} onClick={handleDelete}>
            {pending ? "O'chirilmoqda..." : "O'chirish"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
