"use client";

import { Fragment, useState } from "react";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/Table";
import { Badge } from "@/components/Badge";
import { formatDate } from "@/lib/format";
import type { RosterEntry, StudentDetail } from "@/services/tutorDashboard";

export function RosterTable({ roster }: { roster: RosterEntry[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, StudentDetail>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

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
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>O&apos;quvchi</TableHeaderCell>
          <TableHeaderCell align="right">Imtihonlar</TableHeaderCell>
          <TableHeaderCell align="right">Mashqlar</TableHeaderCell>
          <TableHeaderCell>Oxirgi faollik</TableHeaderCell>
          <TableHeaderCell align="right">O&apos;rtacha ball</TableHeaderCell>
          <TableHeaderCell>Holat</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {roster.map((student) => {
          const isExpanded = expandedId === student.studentId;
          const detail = details[student.studentId];
          const isLoading = loadingId === student.studentId;
          const hasError = errorId === student.studentId;

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
              </TableRow>

              {isExpanded && (
                <TableRow>
                  <TableCell colSpan={6} className="py-4">
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
                          <p className="mb-2 text-sm font-medium text-text">
                            Mavzular bo&apos;yicha o&apos;zlashtirish
                          </p>
                          <div className="space-y-2">
                            {detail.masteryByTopic.map((m) => (
                              <div
                                key={m.topicName}
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
                        </div>
                        <div>
                          <p className="mb-2 text-sm font-medium text-text">
                            Urinishlar tarixi
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
  );
}
