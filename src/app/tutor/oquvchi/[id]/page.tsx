import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { canViewStudent } from "@/lib/permissions";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { readinessFromScore } from "@/lib/readiness";
import {
  getStudentGroupContext,
  getStudentDetailForTutor,
} from "@/services/tutorDashboard";
import { getStudentMistakes } from "@/services/mistakes";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { StatTile } from "@/components/StatTile";
import { Badge, BADGE_SOLID_CLASS } from "@/components/Badge";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/Table";
import { StudentActions } from "./StudentActions";

/** Ro'yxatda ko'rsatiladigan eng ko'p takrorlangan xatolar soni. */
const TOP_MISTAKES = 8;

export default async function TutorStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("TUTOR");
  const { id: studentId } = await params;

  // Ruxsat: ustoz faqat O'Z guruhidagi o'quvchini ko'ra oladi. "Topilmadi"
  // va "ruxsat yo'q" ataylab bir xil javob beradi — aks holda ustoz boshqa
  // guruhda qaysi o'quvchi ID'lari mavjudligini bilib olardi.
  const context = await getStudentGroupContext(studentId);
  if (!context || !canViewStudent(user, context.student, context.group)) {
    notFound();
  }

  const [detail, mistakes] = await Promise.all([
    getStudentDetailForTutor(studentId),
    getStudentMistakes(studentId),
  ]);
  if (!detail) notFound();

  // Ko'rsatkichlar shu yerda, tarixdan hisoblanadi — alohida so'rov
  // qo'shilmadi. Qoida panellardagi bilan bir xil: o'rtacha ball FAQAT
  // yakunlangan imtihonlardan (`getStudentDetailForTutor` yakunlanmaganini
  // umuman qaytarmaydi).
  const examAttempts = detail.attempts.filter((a) => a.mode === "EXAM");
  const practiceAttempts = detail.attempts.filter((a) => a.mode === "PRACTICE");
  const examScores = examAttempts
    .map((a) => a.score)
    .filter((s): s is number => s !== null);
  const averageScore =
    examScores.length > 0
      ? Math.round(examScores.reduce((sum, s) => sum + s, 0) / examScores.length)
      : null;
  const readiness = readinessFromScore(averageScore);
  const lastActivity = detail.attempts[0]?.date ?? null;

  const topMistakes = mistakes.items.filter((m) => !m.isFixed).slice(0, TOP_MISTAKES);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/tutor" className="text-sm text-brand underline">
          &larr; Guruhga qaytish
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-text">{detail.name}</h1>
            <p className="mt-1 text-sm text-text-muted">
              {detail.groupName ?? "Guruhsiz"}
              {!detail.isActive && " · hisob bloklangan"}
            </p>
          </div>
          <StudentActions
            studentId={studentId}
            studentName={detail.name}
            isActive={detail.isActive}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="O'rtacha ball"
          value={averageScore !== null ? `${averageScore}%` : "—"}
          sub="Yakunlangan imtihonlar"
        />
        <StatTile label="Imtihonlar" value={examAttempts.length} />
        <StatTile label="Mashqlar" value={practiceAttempts.length} />
        <StatTile
          label="Oxirgi faollik"
          value={lastActivity ? formatDate(new Date(lastActivity)) : "—"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tayyorgarlik holati</CardTitle>
          <span className="text-sm text-text-muted">Imtihonlar bo&apos;yicha</span>
        </CardHeader>
        <Badge variant={readiness.variant}>{readiness.label}</Badge>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mavzular bo&apos;yicha o&apos;zlashtirish</CardTitle>
            <span className="text-sm text-text-muted">Eng zaifi birinchi</span>
          </CardHeader>
          {detail.masteryByTopic.length === 0 ? (
            <p className="text-sm text-text-muted">
              Imtihon topshirilmagan — mavzu tahlili yakunlangan imtihon
              natijalari asosida hisoblanadi.
            </p>
          ) : (
            <div className="space-y-3">
              {detail.masteryByTopic.map((topic) => (
                <div key={topic.topicId} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-sm text-text-muted">
                    {topic.topicName}
                  </span>
                  <div className="h-2 flex-1 rounded-full bg-bg-subtle">
                    <div
                      className={cn(
                        "h-2 rounded-full",
                        BADGE_SOLID_CLASS[
                          readinessFromScore(topic.masteryPercent).variant
                        ]
                      )}
                      style={{ width: `${topic.masteryPercent}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono text-sm text-text">
                    {topic.masteryPercent}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hali tuzatilmagan xatolar</CardTitle>
            {/* Bu ro'yxat o'quvchining o'z "Xatolarim" bo'limi bilan AYNI
                funksiyadan oziqlanadi — ustoz va o'quvchi bir xil ro'yxatni
                ko'radi va dars paytida bir-birini tushunmay qolmaydi. */}
            <span className="text-sm text-text-muted">
              {mistakes.stillWrongCount} ta
            </span>
          </CardHeader>
          {!mistakes.hasFinishedAttempt ? (
            <p className="text-sm text-text-muted">
              O&apos;quvchi hali birorta testni yakunlamagan.
            </p>
          ) : topMistakes.length === 0 ? (
            <p className="text-sm text-text-muted">
              Tuzatilmagan xato yo&apos;q. Ilgari xato qilganlarini o&apos;rgangan
              ({mistakes.fixedCount} ta).
            </p>
          ) : (
            <ul className="space-y-3">
              {topMistakes.map((m) => (
                <li key={m.questionId} className="rounded-md border border-border p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-brand">{m.topicName}</span>
                    {m.wrongCount > 1 && (
                      <span className="shrink-0 font-mono text-xs text-danger">
                        {m.wrongCount} marta
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-text">{m.text}</p>
                  <p className="mt-1 text-xs text-success">
                    To&apos;g&apos;ri javob: {m.correctAnswerText}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Urinishlar tarixi</CardTitle>
          <span className="text-sm text-text-muted">
            Yakunlanganlari &middot; mashq ham, imtihon ham
          </span>
        </CardHeader>
        {detail.attempts.length === 0 ? (
          <p className="text-sm text-text-muted">Hali yakunlangan urinish yo&apos;q.</p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Sana</TableHeaderCell>
                <TableHeaderCell>Rejim</TableHeaderCell>
                <TableHeaderCell align="right">Ball</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detail.attempts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{formatDate(new Date(a.date))}</TableCell>
                  <TableCell>
                    <Badge variant={a.mode === "EXAM" ? "brand" : "neutral"}>
                      {a.mode === "EXAM" ? "Imtihon" : "Mashq"}
                    </Badge>
                  </TableCell>
                  <TableCell align="right">
                    {a.score !== null ? `${a.score}%` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
