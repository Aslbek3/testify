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
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ResetPasswordModal } from "@/components/ResetPasswordModal";
import type { OrganizationStudentRow } from "@/services/directorDashboard";

export function StudentsTable({
  students,
  groups,
}: {
  students: OrganizationStudentRow[];
  groups: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [resetPasswordFor, setResetPasswordFor] = useState<OrganizationStudentRow | null>(null);

  async function handleToggleActive(studentId: string, nextActive: boolean) {
    setTogglingId(studentId);
    try {
      const res = await fetch(`/api/tutor/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (res.ok) router.refresh();
    } finally {
      setTogglingId(null);
    }
  }

  async function handleChangeGroup(studentId: string, groupId: string) {
    setMovingId(studentId);
    try {
      const res = await fetch(`/api/director/students/${studentId}/group`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      });
      if (res.ok) router.refresh();
    } finally {
      setMovingId(null);
    }
  }

  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>O&apos;quvchi</TableHeaderCell>
            <TableHeaderCell>Guruh</TableHeaderCell>
            <TableHeaderCell>Ustoz</TableHeaderCell>
            <TableHeaderCell align="right">Imtihonlar</TableHeaderCell>
            <TableHeaderCell align="right">O&apos;rtacha ball</TableHeaderCell>
            <TableHeaderCell>Holat</TableHeaderCell>
            <TableHeaderCell>Hisob</TableHeaderCell>
            <TableHeaderCell>Amallar</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {students.map((student) => {
            const isToggling = togglingId === student.studentId;
            const isMoving = movingId === student.studentId;
            return (
              <TableRow key={student.studentId}>
                <TableCell className="font-medium">{student.name}</TableCell>
                <TableCell>
                  <select
                    value={student.groupId}
                    disabled={isMoving}
                    onChange={(e) => handleChangeGroup(student.studentId, e.target.value)}
                    className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>{student.tutorName}</TableCell>
                <TableCell align="right">{student.examAttemptCount}</TableCell>
                <TableCell align="right">
                  {student.averageScore !== null ? `${student.averageScore}%` : "Imtihon topshirilmagan"}
                </TableCell>
                <TableCell>
                  <Badge variant={student.status.variant}>{student.status.label}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={student.isActive ? "success" : "danger"}>
                    {student.isActive ? "Faol" : "Bloklangan"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isToggling}
                      onClick={() => handleToggleActive(student.studentId, !student.isActive)}
                    >
                      {isToggling ? "..." : student.isActive ? "Bloklash" : "Tiklash"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setResetPasswordFor(student)}
                    >
                      Parolni tiklash
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {resetPasswordFor && (
        <ResetPasswordModal
          open={true}
          onClose={() => setResetPasswordFor(null)}
          endpoint={`/api/tutor/students/${resetPasswordFor.studentId}/password`}
          userName={resetPasswordFor.name}
        />
      )}
    </>
  );
}
