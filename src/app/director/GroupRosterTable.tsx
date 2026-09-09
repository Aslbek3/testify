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
import { formatDate } from "@/lib/format";
import type { RosterEntry } from "@/services/tutorDashboard";

/**
 * Guruh sahifasidagi o'quvchilar ro'yxati — direktor uchun KO'RISH
 * ko'rinishi.
 *
 * Nega ustoz panelidagi `RosterTable` ishlatilmadi: u qatorni bosganda
 * `/tutor/oquvchi/[id]` sahifasiga o'tadi, direktor esa u sahifani
 * ocholmaydi (`requireRole("TUTOR")` uni o'z paneliga qaytarib yuboradi) —
 * ya'ni har bosish "hech narsa bo'lmadi"ga aylanardi. Bu yerda hisobni
 * bloklash/parol tiklash tugmalari ham yo'q: ular direktorda allaqachon
 * bitta joyda — "O'quvchilar" bo'limida (`/director/oquvchilar`), va
 * uchinchi nusxa paydo bo'lishi kerak emas. Shu sababdan bu komponent
 * mijoz holatisiz (server komponent) qoladi.
 *
 * Ma'lumot manbai ustoznikiga aynan bir xil — `getRosterForGroup`.
 */
export function GroupRosterTable({ roster }: { roster: RosterEntry[] }) {
  if (roster.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        Guruhda hali o&apos;quvchilar yo&apos;q. O&apos;quvchi qo&apos;shish
        yoki boshqa guruhdan ko&apos;chirish{" "}
        <Link href="/director/oquvchilar" className="text-brand hover:underline">
          O&apos;quvchilar
        </Link>{" "}
        bo&apos;limida.
      </p>
    );
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
          <TableHeaderCell>Hisob</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {roster.map((student) => (
          <TableRow key={student.studentId}>
            <TableCell className="font-medium">{student.name}</TableCell>
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
