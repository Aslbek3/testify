"use client";

import { useState } from "react";
import { useServerMutation } from "@/lib/useServerMutation";
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
  // `pending` so'rov ham, sahifa yangilanishi ham tugaganini bildiradi —
  // ilgari tugma darhol yoqilib, jadval esa bir necha soniya eski
  // ma'lumot bilan turardi.
  const { run, pending, error } = useServerMutation();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [resetPasswordFor, setResetPasswordFor] = useState<OrganizationStudentRow | null>(null);

  async function handleToggleActive(studentId: string, nextActive: boolean) {
    setTogglingId(studentId);
    await run(() =>
      fetch(`/api/tutor/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      })
    );
    setTogglingId(null);
  }

  async function handleChangeGroup(studentId: string, groupId: string) {
    setMovingId(studentId);
    await run(() =>
      fetch(`/api/director/students/${studentId}/group`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      })
    );
    setMovingId(null);
  }

  return (
    <>
      {error && (
        <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
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
            const isToggling = togglingId === student.studentId && pending;
            const isMoving = movingId === student.studentId && pending;
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
