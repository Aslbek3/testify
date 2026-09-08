"use client";

import { Fragment, useState } from "react";
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
import { formatDate } from "@/lib/format";
import type { RosterEntry, StudentDetail } from "@/services/tutorDashboard";

export function RosterTable({ roster }: { roster: RosterEntry[] }) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, StudentDetail>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
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
      if (res.ok) router.refresh();
    } finally {
      setTogglingId(null);
    }
  }

  async function handleRowClick(studentId: string) {
    if (expandedId === studentId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(studentId);

    if (details[studentId]) return;

    setErrorId(null);
    setLoadingId(studentId);
    try {
      const res = await fetch(`/api/tutor/students/${studentId}`);
      if (!res.ok) {
        setErrorId(studentId);
        return;
      }
      const data: StudentDetail = await res.json();
      setDetails((prev) => ({ ...prev, [studentId]: data }));
    } catch {
      setErrorId(studentId);
    } finally {
      setLoadingId(null);
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
          const isExpanded = expandedId === student.studentId;
          const detail = details[student.studentId];
          const isLoading = loadingId === student.studentId;
          const hasError = errorId === student.studentId;
          const isToggling = togglingId === student.studentId;

          return (
            <Fragment key={student.studentId}>
              <TableRow clickable onClick={() => handleRowClick(student.studentId)}>
                <TableCell className="font-medium">{student.name}</TableCell>
                <TableCell align="right">{student.examAttemptCount}</TableCell>
                <TableCell align="right">{student.practiceAttemptCount}</TableCell>
                <TableCell>
                  {student.lastActivityAt ? formatDate(student.lastActivityAt) : "—"}
                </TableCell>
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

              {isExpanded && (
                <TableRow>
                  <TableCell colSpan={8} className="py-4">
                    {isLoading && (
                      <p className="text-sm text-text-muted">Yuklanmoqda...</p>
                    )}
                    {!isLoading && hasError && (
                      <p className="text-sm text-danger">
                        Ma&apos;lumotni yuklab bo&apos;lmadi.
                      </p>
                    )}
                    {!isLoading && !hasError && detail && (
                      <div className="grid gap-6 sm:grid-cols-2">
                        <div>
                          <p className="text-sm font-medium text-text">
                            Mavzular bo&apos;yicha o&apos;zlashtirish
                          </p>
                          {/* Doira ataylab boshqacha: jadvaldagi ustunlar
                              FAQAT shu guruhda topshirilgan imtihonlarni
                              sanaydi (ustoz o'zi qilmagan ish uchun
                              baholanmasin), bu yerda esa o'quvchining BARCHA
                              imtihonlari ko'rsatiladi — boshqa guruhdan
                              ko'chib kelgan o'quvchining zaif mavzusini yangi
                              ustoz ham bilishi kerak. Ikkalasi bir xil emas,
                              shuning uchun manba ochiq yozilgan. */}
                          <p className="mb-2 text-xs text-text-muted">
                            Barcha imtihonlar bo&apos;yicha (boshqa guruhdagilari ham)
                          </p>
                          {detail.masteryByTopic.length === 0 ? (
                            // Bo'sh holat matni majburiy: mavzu tahlili faqat
                            // yakunlangan imtihonlardan hisoblanadi, shuning
                            // uchun faqat mashq qilgan o'quvchida ro'yxat
                            // bo'sh qoladi — bu "0%" degani emas.
                            <p className="text-sm text-text-muted">
                              Imtihon topshirilmagan — mavzu tahlili imtihon
                              natijalari asosida hisoblanadi.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {detail.masteryByTopic.map((m) => (
                                <div
                                  key={m.topicId}
                                  className="grid grid-cols-[140px_1fr_40px] items-center gap-2"
                                >
                                  <span className="truncate text-sm text-text-muted">
                                    {m.topicName}
                                  </span>
                                  <div className="h-2 rounded bg-bg-subtle">
                                    <div
                                      className="h-2 rounded bg-brand"
                                      style={{ width: `${m.masteryPercent}%` }}
                                    />
                                  </div>
                                  <span className="text-right font-mono text-sm tabular-nums text-text-muted">
                                    {m.masteryPercent}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text">
                            Urinishlar tarixi
                          </p>
                          <p className="mb-2 text-xs text-text-muted">
                            Barcha guruhlardagi yakunlangan urinishlar
                          </p>
                          {detail.attempts.length === 0 ? (
                            <p className="text-sm text-text-muted">
                              Hali yakunlangan urinish yo&apos;q.
                            </p>
                          ) : (
                            <ul className="space-y-1.5">
                              {detail.attempts.map((a) => (
                                <li
                                  key={a.id}
                                  className="flex items-center justify-between gap-2 text-sm"
                                >
                                  <span className="flex items-center gap-2 text-text-muted">
                                    {formatDate(new Date(a.date))}
                                    <Badge variant={a.mode === "EXAM" ? "brand" : "neutral"}>
                                      {a.mode === "EXAM" ? "Imtihon" : "Mashq"}
                                    </Badge>
                                  </span>
                                  <span className="font-mono tabular-nums text-text">
                                    {a.score !== null ? `${a.score}%` : "—"}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
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
