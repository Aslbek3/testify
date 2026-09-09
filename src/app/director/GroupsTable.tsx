"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/Table";
import { Button } from "@/components/Button";
import { formatDate } from "@/lib/format";
import { GroupFormModal } from "./GroupFormModal";
import { DeleteGroupModal } from "./DeleteGroupModal";
import type { GroupOverviewRow } from "@/services/directorDashboard";

export function GroupsTable({
  groups,
  tutors,
  nameMaxLength,
}: {
  groups: GroupOverviewRow[];
  tutors: { id: string; name: string }[];
  nameMaxLength: number;
}) {
  const [editing, setEditing] = useState<GroupOverviewRow | null>(null);
  const [deleting, setDeleting] = useState<GroupOverviewRow | null>(null);

  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Guruh</TableHeaderCell>
            <TableHeaderCell>Ustoz</TableHeaderCell>
            <TableHeaderCell align="right">O&apos;quvchilar</TableHeaderCell>
            <TableHeaderCell>So&apos;nggi faollik</TableHeaderCell>
            <TableHeaderCell>Amallar</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {groups.map((group) => (
            <TableRow key={group.groupId}>
              <TableCell className="font-medium">
                {/* Butun qatorni bosiladigan qilish o'rniga havola: qatorda
                    tugmalar ham bor, ular bilan bosish sohalari to'qnashadi
                    (ustoz panelidagi RosterTable'da har bir tugmada
                    stopPropagation qilishga to'g'ri kelgan). */}
                <Link
                  href={`/director/guruh/${group.groupId}`}
                  className="text-brand hover:underline"
                >
                  {group.groupName}
                </Link>
              </TableCell>
              <TableCell>{group.tutorName}</TableCell>
              <TableCell align="right">{group.studentCount}</TableCell>
              <TableCell>
                {group.lastActivityAt
                  ? formatDate(group.lastActivityAt)
                  : "Faollik yo'q"}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setEditing(group)}
                  >
                    Tahrirlash
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setDeleting(group)}
                  >
                    O&apos;chirish
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editing && (
        <GroupFormModal
          tutors={tutors}
          nameMaxLength={nameMaxLength}
          group={{
            groupId: editing.groupId,
            groupName: editing.groupName,
            tutorId: editing.tutorId,
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <DeleteGroupModal group={deleting} onClose={() => setDeleting(null)} />
      )}
    </>
  );
}
