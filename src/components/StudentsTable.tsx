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
import Link from "next/link";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { CompareBar } from "@/components/CompareBar";
import { formatRelativeDays } from "@/lib/format";
import { ResetPasswordModal } from "@/components/ResetPasswordModal";
import type { OrganizationStudentRow } from "@/services/directorDashboard";
import type { StudentAccessLabel } from "@/lib/labels";
import { StudentAccessBadge } from "@/components/StudentAccessBadge";
import type { StudentPaymentMonths } from "@/lib/payments";
import { CashPaymentModal } from "@/components/CashPaymentModal";

/**
 * Tashkilotdagi o'quvchilar ro'yxati — direktor va qabulxona uchun
 * AYNI jadval.
 *
 * Nima ko'rinishini rol emas, `props` hal qiladi: server sahifasi
 * ruxsat funksiyalariga qarab qaysi ustun/tugma kerakligini aytadi.
 * Shunday qilingani uchun bu yerda birorta ham "agar qabulxona bo'lsa"
 * degan shart yo'q — ruxsat mantiqi faqat `lib/permissions.ts` da.
 */
export function StudentsTable({
  students,
  groups,
  payments,
  showProgress,
  organizationAverage,
  studentBasePath,
  groupBasePath,
  tutorBasePath,
}: {
  students: OrganizationStudentRow[];
  groups: { id: string; name: string }[];
  /**
   * O'quvchi to'lovi yoqilgan va foydalanuvchi to'lovni ko'rib chiqa
   * olsa — har o'quvchining holati va narxlar ("Naqd" tugmasi uchun).
   * `null` — to'lov o'chiq yoki ruxsat yo'q: ustun ham, tugma ham
   * ko'rsatilmaydi.
   */
  payments: {
    byStudent: Record<string, StudentAccessLabel>;
    prices: Record<StudentPaymentMonths, number>;
  } | null;
  /**
   * Imtihonlar soni, o'rtacha ball va tayyorgarlik holati ustunlari.
   * "Qabulxona natijalarni ko'radi" kaliti o'chirilgan bo'lsa `false`:
   * qabulxona ma'muriy ishini qiladi, lekin o'quv natijalarini ko'rmaydi.
   */
  showProgress: boolean;
  /**
   * Taqqoslash chizigi turadigan qiymat — tashkilotning ortacha bali.
   * `undefined` bolsa chiziq chizilmaydi, shkalaning ozi qoladi.
   */
  organizationAverage?: number | null;
  /**
   * Havola PREFIKSLARI, funksiya emas: bu komponent klientda ishlaydi va
   * React server komponentidan klientga funksiya uzatishga ruxsat
   * bermaydi (u seriyalanmaydi). Prefiks satr — bemalol uzatiladi.
   *
   * Masalan `studentBasePath="/oquvchi"` -> `/oquvchi/<id>`.
   * Berilmasa havola umuman chizilmaydi.
   */
  studentBasePath?: string;
  groupBasePath?: string;
  tutorBasePath?: string;
}) {
  // `pending` so'rov ham, sahifa yangilanishi ham tugaganini bildiradi —
  // ilgari tugma darhol yoqilib, jadval esa bir necha soniya eski
  // ma'lumot bilan turardi.
  const { run, pending, error } = useServerMutation();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [resetPasswordFor, setResetPasswordFor] = useState<OrganizationStudentRow | null>(null);
  const [cashFor, setCashFor] = useState<OrganizationStudentRow | null>(null);

  async function handleToggleActive(studentId: string, nextActive: boolean) {
    setTogglingId(studentId);
    await run(() =>
      fetch(`/api/students/${studentId}`, {
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
      fetch(`/api/students/${studentId}/group`, {
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
            {showProgress && (
              <>
                <TableHeaderCell align="right">Imtihonlar</TableHeaderCell>
                <TableHeaderCell className="w-[176px]">O&apos;rtacha ball</TableHeaderCell>
                <TableHeaderCell>Oxirgi faollik</TableHeaderCell>
                <TableHeaderCell>Holat</TableHeaderCell>
              </>
            )}
            <TableHeaderCell>Hisob</TableHeaderCell>
            {payments && <TableHeaderCell>To&apos;lov</TableHeaderCell>}
            <TableHeaderCell>Amallar</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {students.map((student) => {
            const isToggling = togglingId === student.studentId && pending;
            const isMoving = movingId === student.studentId && pending;
            return (
              <TableRow key={student.studentId}>
                <TableCell>
                  {studentBasePath ? (
                    <Link
                      href={`${studentBasePath}/${student.studentId}`}
                      className="font-semibold text-text underline-offset-2 hover:text-brand hover:underline"
                    >
                      {student.name}
                    </Link>
                  ) : (
                    <span className="font-semibold text-text">{student.name}</span>
                  )}
                </TableCell>
                <TableCell data-label="Guruh">
                  <div className="flex items-center gap-1">
                    <select
                      value={student.groupId}
                      disabled={isMoving}
                      onChange={(e) => handleChangeGroup(student.studentId, e.target.value)}
                      aria-label={`${student.name} uchun guruhni almashtirish`}
                      className="min-w-0 rounded-md border border-border bg-bg px-2.5 py-1.5 text-[13px] text-text transition-colors focus-visible:border-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15"
                    >
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                    {/* Tanlagich guruhni ALMASHTIRADI; bu havola esa guruh
                        jurnalini OCHADI. Ikki xil amal — ikki xil element. */}
                    {groupBasePath && (
                      <Link
                        href={`${groupBasePath}/${student.groupId}`}
                        aria-label={`${student.groupName} guruhini ochish`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-surface-2 hover:text-brand"
                      >
                        <Icon name="chevronRight" className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </TableCell>
                <TableCell data-label="Ustoz">
                  {tutorBasePath ? (
                    <Link
                      href={`${tutorBasePath}/${student.tutorId}`}
                      className="font-medium text-text-muted underline-offset-2 hover:text-brand hover:underline"
                    >
                      {student.tutorName}
                    </Link>
                  ) : (
                    student.tutorName
                  )}
                </TableCell>
                {showProgress && (
                  <>
                    <TableCell align="right" data-label="Imtihonlar">
                      {student.examAttemptCount}
                    </TableCell>
                    <TableCell data-label="O'rtacha ball">
                      <CompareBar
                        value={student.averageScore}
                        average={organizationAverage ?? null}
                      />
                    </TableCell>
                    <TableCell data-label="Oxirgi faollik">
                      <span className="font-mono text-[13px] tabular-nums text-text-muted">
                        {formatRelativeDays(student.lastActivityAt)}
                      </span>
                    </TableCell>
                    <TableCell data-label="Holat">
                      <Badge variant={student.status.variant}>{student.status.label}</Badge>
                    </TableCell>
                  </>
                )}
                <TableCell data-label="Hisob">
                  <Badge variant={student.isActive ? "success" : "danger"}>
                    {student.isActive ? "Faol" : "Bloklangan"}
                  </Badge>
                </TableCell>
                {payments && (
                  <TableCell data-label="To'lov">
                    <StudentAccessBadge status={payments.byStudent[student.studentId]} />
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {payments && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setCashFor(student)}
                      >
                        Naqd
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant={student.isActive ? "secondary" : "primary"}
                      disabled={isToggling}
                      onClick={() => handleToggleActive(student.studentId, !student.isActive)}
                    >
                      {isToggling ? "..." : student.isActive ? "Bloklash" : "Tiklash"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
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

      {cashFor && payments && (
        <CashPaymentModal
          studentId={cashFor.studentId}
          studentName={cashFor.name}
          prices={payments.prices}
          onClose={() => setCashFor(null)}
        />
      )}

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
