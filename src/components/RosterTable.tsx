"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRefresh } from "@/lib/useServerMutation";
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
import { CompareBar } from "@/components/CompareBar";
import { StudentAccessBadge } from "@/components/StudentAccessBadge";
import { ResetPasswordModal } from "@/components/ResetPasswordModal";
import { EmptyState } from "@/components/EmptyState";
import type { StudentAccessLabel } from "@/lib/labels";
import type { RosterEntry } from "@/services/tutorDashboard";
import { formatRelativeDays } from "@/lib/format";

/**
 * Guruh ro'yxati — BARCHA rollar uchun bitta jadval.
 *
 * Ilgari ikki nusxa bor edi: ustoznikida qator `/tutor/oquvchi/[id]` ga
 * olib borardi, direktor esa u sahifani ochib bo'lmasligi sababli
 * o'zining ko'rish-uchun nusxasini (`GroupRosterTable`) ishlatardi.
 * O'quvchi sahifasi umumiy manzilga (`/oquvchi/[id]`) ko'chgach, ikkinchi
 * nusxaga ehtiyoj qolmadi.
 *
 * Qaysi tugma ko'rinishini ROL emas, proplar hal qiladi — ruxsat mantiqi
 * faqat `lib/permissions.ts` da.
 */
export function RosterTable({
  roster,
  paymentStatus,
  groupAverage,
  canManage,
  canResetPassword,
  emptyHint,
}: {
  roster: RosterEntry[];
  /** O'quvchi to'lovi holati (faqat ko'rish uchun). `null` — to'lov o'chiq. */
  paymentStatus: Record<string, StudentAccessLabel> | null;
  /** Taqqoslash chizig'i — guruhning o'rtacha bali. */
  groupAverage: number | null;
  /** Hisobni bloklash/tiklash — `canManageStudent`. */
  canManage: boolean;
  /** Parolni tiklash — alohida ruxsat (`canResetStudentPassword`). */
  canResetPassword: boolean;
  /** Ro'yxat bo'sh bo'lganda nima qilish kerakligi — rolga qarab boshqa. */
  emptyHint?: string;
}) {
  const router = useRouter();
  const { refresh, refreshing } = useRefresh();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [resetPasswordFor, setResetPasswordFor] = useState<RosterEntry | null>(null);

  const showActions = canManage || canResetPassword;

  async function handleToggleActive(studentId: string, nextActive: boolean) {
    setTogglingId(studentId);
    try {
      const res = await fetch(`/api/students/${studentId}`, {
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
    return (
      <EmptyState
        icon="users"
        title="Guruhda hali o'quvchilar yo'q"
        description={emptyHint}
      />
    );
  }

  return (
    <>
      <Table className="min-w-[860px]">
        <TableHead>
          <TableRow>
            <TableHeaderCell>O&apos;quvchi</TableHeaderCell>
            <TableHeaderCell align="right">Imtihon</TableHeaderCell>
            <TableHeaderCell align="right">Mashq</TableHeaderCell>
            <TableHeaderCell className="w-[180px]">O&apos;rtacha ball</TableHeaderCell>
            <TableHeaderCell>Oxirgi faollik</TableHeaderCell>
            <TableHeaderCell>Holat</TableHeaderCell>
            {paymentStatus && <TableHeaderCell>To&apos;lov</TableHeaderCell>}
            {showActions && (
              <TableHeaderCell align="right" className="no-print">
                Amallar
              </TableHeaderCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {roster.map((student) => {
            // `refreshing` ham qo'shildi: tugma jadval HAQIQATAN
            // yangilangunicha band holatda qoladi.
            const isToggling = togglingId === student.studentId || refreshing;
            const href = `/oquvchi/${student.studentId}`;

            return (
              <TableRow
                key={student.studentId}
                clickable
                onClick={() => router.push(href)}
              >
                <TableCell>
                  {/* Qator ham bosiladi, lekin ismning o'zi ham havola:
                      faqat `onClick` klaviatura va ekran o'quvchisi uchun
                      yetarli emas. */}
                  <Link
                    href={href}
                    onClick={(event) => event.stopPropagation()}
                    className="font-semibold text-text underline-offset-2 hover:text-brand hover:underline"
                  >
                    {student.name}
                  </Link>
                  {!student.isActive && (
                    <span className="mt-0.5 block text-[11.5px] text-danger">
                      Hisob bloklangan
                    </span>
                  )}
                </TableCell>
                <TableCell align="right">{student.examAttemptCount}</TableCell>
                <TableCell align="right">{student.practiceAttemptCount}</TableCell>
                <TableCell>
                  <CompareBar value={student.averageScore} average={groupAverage} />
                </TableCell>
                <TableCell>
                  <span className="font-mono text-[13px] tabular-nums text-text-muted">
                    {formatRelativeDays(student.lastActivityAt)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={student.status.variant}>{student.status.label}</Badge>
                </TableCell>
                {paymentStatus && (
                  <TableCell>
                    <StudentAccessBadge status={paymentStatus[student.studentId]} />
                  </TableCell>
                )}
                {showActions && (
                  <TableCell align="right" className="no-print">
                    <div className="flex flex-wrap justify-end gap-2">
                      {canManage && (
                        <Button
                          type="button"
                          size="sm"
                          variant={student.isActive ? "secondary" : "primary"}
                          disabled={isToggling}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleActive(student.studentId, !student.isActive);
                          }}
                        >
                          {isToggling ? "..." : student.isActive ? "Bloklash" : "Tiklash"}
                        </Button>
                      )}
                      {canResetPassword && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setResetPasswordFor(student);
                          }}
                        >
                          Parol
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {resetPasswordFor && (
        <ResetPasswordModal
          open={true}
          onClose={() => setResetPasswordFor(null)}
          endpoint={`/api/students/${resetPasswordFor.studentId}/password`}
          userName={resetPasswordFor.name}
        />
      )}
    </>
  );
}
