"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { GroupFormModal } from "../GroupFormModal";
import { DeleteGroupModal } from "../DeleteGroupModal";
import type { GroupOverviewRow } from "@/services/directorDashboard";

/**
 * Jurnal qatoridagi guruh amallari — tahrirlash va o'chirish.
 *
 * Ilgari bular `GroupsTable` ichida edi va u faqat direktor panelida
 * turardi. Endi jurnal o'sha jadvalning o'rnini bosgani uchun amallar ham
 * shu yerga ko'chdi — modal formalar (`GroupFormModal`, `DeleteGroupModal`)
 * o'zgarmadi, ya'ni tasdiqlash va xato xabarlari avvalgidek ishlaydi.
 *
 * `relative z-10` — qator butunlay bosiladigan havola (`after:inset-0`),
 * shuning uchun tugmalar uning USTIDA turishi kerak, aks holda bosilganda
 * guruh sahifasi ochilib ketardi.
 */
export function GroupRowActions({
  group,
  tutors,
  nameMaxLength,
}: {
  group: GroupOverviewRow;
  tutors: { id: string; name: string }[];
  nameMaxLength: number;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // O'quvchisi yoki urinishi bor guruhni o'chirib bo'lmaydi (server ham rad
  // etadi) — tugma sababi bilan o'chirilgan holda ko'rsatiladi, shunda
  // direktor bosib xato xabarini kutmaydi.
  const canDelete = group.studentCount === 0 && group.attemptCount === 0;
  const deleteReason =
    group.studentCount > 0
      ? "O'quvchisi bor guruhni o'chirib bo'lmaydi"
      : "Urinishlari bor guruhni o'chirib bo'lmaydi";

  return (
    <div className="relative z-10 flex flex-wrap justify-end gap-2">
      <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(true)}>
        Tahrirlash
      </Button>
      <Button
        type="button"
        size="sm"
        variant="danger"
        disabled={!canDelete}
        title={canDelete ? undefined : deleteReason}
        onClick={() => setDeleting(true)}
      >
        O&apos;chirish
      </Button>

      {editing && (
        <GroupFormModal
          tutors={tutors}
          nameMaxLength={nameMaxLength}
          group={{
            groupId: group.groupId,
            groupName: group.groupName,
            tutorId: group.tutorId,
          }}
          onClose={() => setEditing(false)}
        />
      )}

      {deleting && (
        <DeleteGroupModal group={group} onClose={() => setDeleting(false)} />
      )}
    </div>
  );
}
