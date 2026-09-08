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
import type { TutorRankingRow } from "@/services/directorDashboard";

export function TutorRankingTable({ rows }: { rows: TutorRankingRow[] }) {
  const router = useRouter();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [resetPasswordFor, setResetPasswordFor] = useState<TutorRankingRow | null>(null);

  async function handleToggleActive(tutorId: string, nextActive: boolean) {
    setTogglingId(tutorId);
    try {
      const res = await fetch(`/api/tutors/${tutorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (res.ok) router.refresh();
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <>
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>#</TableHeaderCell>
          <TableHeaderCell>Ustoz</TableHeaderCell>
          <TableHeaderCell>Guruh</TableHeaderCell>
          {/* Ikki ustun ataylab boshqacha nomlangan: birinchisi guruhning
              HOZIRGI a'zolari, ikkinchisi esa shu guruhda topshirilgan
              imtihonlardan chiqqan ball — boshqa guruhga ko'chib ketgan
              o'quvchining natijasi ham shu yerda qoladi. Ball qatorining
              ostida u nechta o'quvchi natijasidan chiqqani yoziladi. */}
          <TableHeaderCell align="right">
            Hozirgi o&apos;quvchilar
          </TableHeaderCell>
          <TableHeaderCell align="right">
            O&apos;rtacha ball (imtihon)
          </TableHeaderCell>
          <TableHeaderCell>Hisob</TableHeaderCell>
          <TableHeaderCell>Amallar</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row, index) => {
          const isToggling = togglingId === row.tutorId;
          return (
            <TableRow key={row.tutorId}>
              <TableCell className="font-mono">{index + 1}</TableCell>
              <TableCell className="font-medium">{row.tutorName}</TableCell>
              <TableCell>{row.groupName}</TableCell>
              <TableCell align="right">{row.studentCount}</TableCell>
              <TableCell align="right">
                {row.averageScore === null ? (
                  "—"
                ) : (
                  <>
                    {row.averageScore}%
                    <span className="block text-xs text-text-muted">
                      {row.scoredStudentCount} o&apos;quvchi natijasi
                    </span>
                  </>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={row.isActive ? "success" : "danger"}>
                  {row.isActive ? "Faol" : "Bloklangan"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isToggling}
                    onClick={() => handleToggleActive(row.tutorId, !row.isActive)}
                  >
                    {isToggling ? "..." : row.isActive ? "Bloklash" : "Tiklash"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setResetPasswordFor(row)}
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
        endpoint={`/api/tutors/${resetPasswordFor.tutorId}/password`}
        userName={resetPasswordFor.tutorName}
      />
    )}
    </>
  );
}
