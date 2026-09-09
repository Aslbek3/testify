"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRefresh } from "@/lib/useServerMutation";
import Link from "next/link";
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
import { formatDate } from "@/lib/format";
import type { RosterEntry } from "@/services/tutorDashboard";

/**
 * Guruh ro'yxati. Qator bosilganda o'quvchining to'liq sahifasi ochiladi.
 *
 * Ilgari qator jadval ichida ochilib, mavzu tahlilini AJAX bilan yuklardi.
 * Alohida sahifa ikki jihatdan yaxshiroq: u yerda xatolar ro'yxati va
 * urinishlar tarixi ham sig'adi (jadval ichiga sig'masdi), va sahifaga
 * havola berish mumkin — ustoz uni ochib qoldirib, keyin qaytib kelishi
 * yoki kollegasiga yuborishi mumkin.
 */
export function RosterTable({ roster }: { roster: RosterEntry[] }) {
  const router = useRouter();
  const { refresh, refreshing } = useRefresh();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [resetPasswordFor, setResetPasswordFor] = useState<RosterEntry | null>(null);

  async function handleToggleActive(studentId: string, nextActive: boolean) {
    setTogglingId(studentId);
    try {
      const res = await fetch(`/api/tutor/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (res.ok) await refresh();
    } finally {
      setTogglingId(null);
    }
  }

  if (roster.length === 0) {
    return <p className="text-sm text-text-muted">Guruhda hali o&apos;quvchilar yo&apos;q.</p>;
  }

  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>O&apos;quvchi</TableHeaderCell>
            <TableHeaderCell align="right">Imtihonlar</TableHeaderCell>
            <TableHeaderCell align="right">Mashqlar</TableHeaderCell>
            <TableHeaderCell>Oxirgi faollik</TableHeaderCell>
            <TableHeaderCell align="right">O&apos;rtacha ball</TableHeaderCell>
            <TableHeaderCell>Holat</TableHeaderCell>
            <TableHeaderCell>Hisob</TableHeaderCell>
            <TableHeaderCell>Amallar</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {roster.map((student) => {
            // `refreshing` ham qo'shildi: tugma jadval HAQIQATAN yangilangunicha
            // band holatda qoladi (batafsil izoh `useServerMutation` da).
            const isToggling = togglingId === student.studentId || refreshing;
            const href = `/tutor/oquvchi/${student.studentId}`;

            return (
              <TableRow
                key={student.studentId}
                clickable
                onClick={() => router.push(href)}
              >
                <TableCell className="font-medium">
                  {/* Qator ham bosiladi, lekin ismning o'zi ham havola:
                      faqat `onClick` klaviatura va ekran o'quvchisi uchun
                      yetarli emas. */}
                  <Link
                    href={href}
                    onClick={(event) => event.stopPropagation()}
                    className="text-brand underline"
                  >
                    {student.name}
                  </Link>
                </TableCell>
                <TableCell align="right">{student.examAttemptCount}</TableCell>
                <TableCell align="right">{student.practiceAttemptCount}</TableCell>
                <TableCell>
                  {student.lastActivityAt ? formatDate(student.lastActivityAt) : "—"}
                </TableCell>
                <TableCell align="right">
                  {student.averageScore !== null
                    ? `${student.averageScore}%`
                    : "Imtihon topshirilmagan"}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(student.studentId, !student.isActive);
                      }}
                    >
                      {isToggling ? "..." : student.isActive ? "Bloklash" : "Tiklash"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setResetPasswordFor(student);
                      }}
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
