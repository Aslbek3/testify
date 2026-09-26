"use client";

import { useState } from "react";
import { useServerMutation } from "@/lib/useServerMutation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/Table";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ResetPasswordModal } from "@/components/ResetPasswordModal";
import { formatDate } from "@/lib/format";
import type { ReceptionStaffRow } from "@/services/directorDashboard";

/**
 * Qabulxona xodimlari — bloklash va parol tiklash.
 *
 * Ustozlar reytingidan alohida jadval: qabulxonada o'quvchi ham, guruh
 * ham yo'q, ya'ni o'rtacha ball ustunlari ma'nosiz bo'lardi.
 *
 * Xodim bloklanganda sessiyasi DARHOL uziladi (`sessionVersion`), ya'ni
 * ishdan bo'shagan xodim bir hafta tizimda yurib qolmaydi.
 */
export function ReceptionStaffTable({ rows }: { rows: ReceptionStaffRow[] }) {
  const { run, pending, error } = useServerMutation();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [resetPasswordFor, setResetPasswordFor] = useState<ReceptionStaffRow | null>(null);

  async function handleToggleActive(userId: string, nextActive: boolean) {
    setTogglingId(userId);
    await run(() =>
      fetch(`/api/staff/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      })
    );
    setTogglingId(null);
  }

  return (
    <>
      {error && (
        <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Ism</TableHeaderCell>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>Holat</TableHeaderCell>
            <TableHeaderCell>Qo&apos;shilgan</TableHeaderCell>
            <TableHeaderCell align="right">
              <span className="sr-only">Amallar</span>
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.userId}>
              <TableCell>{row.name}</TableCell>
              <TableCell data-label="Email">
                <span className="text-text-muted">{row.email}</span>
              </TableCell>
              <TableCell data-label="Holat">
                <Badge variant={row.isActive ? "success" : "danger"}>
                  {row.isActive ? "Faol" : "Bloklangan"}
                </Badge>
              </TableCell>
              <TableCell data-label="Qo'shilgan">
                <span className="font-mono tabular-nums">{formatDate(row.createdAt)}</span>
              </TableCell>
              <TableCell align="right">
                <div className="flex justify-end gap-2 font-sans">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setResetPasswordFor(row)}
                  >
                    Parolni tiklash
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pending && togglingId === row.userId}
                    onClick={() => handleToggleActive(row.userId, !row.isActive)}
                  >
                    {pending && togglingId === row.userId
                      ? "..."
                      : row.isActive
                        ? "Bloklash"
                        : "Tiklash"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {resetPasswordFor && (
        <ResetPasswordModal
          open
          endpoint={`/api/staff/${resetPasswordFor.userId}/password`}
          userName={resetPasswordFor.name}
          onClose={() => setResetPasswordFor(null)}
        />
      )}
    </>
  );
}
