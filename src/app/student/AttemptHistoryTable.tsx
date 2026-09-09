"use client";

import Link from "next/link";
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
import { formatDate } from "@/lib/format";
import type { AttemptHistoryItem } from "@/services/studentDashboard";

/**
 * Urinishlar tarixi — yakunlangan qatorni bosib o'sha urinishning natija
 * sahifasi ochiladi.
 *
 * Ilgari natija sahifasi (`/student/test/[attemptId]/natija`) mavjud bo'la
 * turib, unga tarixdan hech qanday havola yo'q edi: o'quvchi kechagi
 * imtihonini qayta ocholmasdi. Qator bosilishidan tashqari har qatorda
 * haqiqiy havola ham bor — faqat `onClick` klaviatura va ekran o'quvchisi
 * uchun yetarli emas.
 */
export function AttemptHistoryTable({ history }: { history: AttemptHistoryItem[] }) {
  const router = useRouter();

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Sana</TableHeaderCell>
          <TableHeaderCell>Rejim</TableHeaderCell>
          <TableHeaderCell align="right">Savollar soni</TableHeaderCell>
          <TableHeaderCell align="right">Ball</TableHeaderCell>
          <TableHeaderCell align="right">Natija</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {history.map((attempt) => {
          const href = `/student/test/${attempt.id}/natija`;
          return (
            <TableRow
              key={attempt.id}
              clickable={attempt.isFinished}
              onClick={
                attempt.isFinished ? () => router.push(href) : undefined
              }
            >
              <TableCell>{formatDate(attempt.date)}</TableCell>
              <TableCell>
                <Badge variant={attempt.mode === "EXAM" ? "brand" : "neutral"}>
                  {attempt.mode === "EXAM" ? "Imtihon" : "Mashq"}
                </Badge>
              </TableCell>
              <TableCell align="right">{attempt.questionCount}</TableCell>
              <TableCell align="right">
                {attempt.score === null ? (
                  <Badge variant="brand">Davom etmoqda</Badge>
                ) : (
                  `${attempt.score}%`
                )}
              </TableCell>
              <TableCell align="right">
                {attempt.isFinished ? (
                  <Link
                    href={href}
                    // Qator ham bosiladi — havola bosilganda ikkalasi
                    // birdan ishlab, ikki marta navigatsiya bo'lmasligi uchun.
                    onClick={(event) => event.stopPropagation()}
                    // `py-3 -my-3` — bosish maydonini 18px dan ~42px ga oshiradi,
                    // lekin manfiy margin tufayli qator balandligi
                    // o'zgarmaydi. "Davom ettirish" uchun bu ayniqsa muhim:
                    // tugallanmagan urinish qatori bosilmaydi, ya'ni bu
                    // yagona yo'l.
                    className="inline-flex min-h-[42px] items-center py-3 -my-3 font-medium text-brand underline"
                  >
                    Ko&apos;rish
                  </Link>
                ) : (
                  <Link
                    href={`/student/test?attemptId=${attempt.id}`}
                    onClick={(event) => event.stopPropagation()}
                    // `py-3 -my-3` — bosish maydonini 18px dan ~42px ga oshiradi,
                    // lekin manfiy margin tufayli qator balandligi
                    // o'zgarmaydi. "Davom ettirish" uchun bu ayniqsa muhim:
                    // tugallanmagan urinish qatori bosilmaydi, ya'ni bu
                    // yagona yo'l.
                    className="inline-flex min-h-[42px] items-center py-3 -my-3 font-medium text-brand underline"
                  >
                    Davom ettirish
                  </Link>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
