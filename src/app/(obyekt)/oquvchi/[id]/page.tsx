import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAnySession } from "@/lib/auth";
import {
  canViewStudent,
  canViewStudentProgress,
  canManageStudent,
  canResetStudentPassword,
} from "@/lib/permissions";
import { cn } from "@/lib/cn";
import { formatDate, formatRelativeDays } from "@/lib/format";
import { readinessFromScore } from "@/lib/readiness";
import {
  getStudentGroupContext,
  getStudentDetailForTutor,
} from "@/services/tutorDashboard";
import { getStudentMistakes } from "@/services/mistakes";
import { getStudentAccessForUser } from "@/services/studentPayments";
import { describeStudentAccess } from "@/lib/labels";
import { Card, CardHeader, CardTitle, CardNote } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumb } from "@/components/Breadcrumb";
import { StatTile } from "@/components/StatTile";
import { EmptyState } from "@/components/EmptyState";
import { Badge, BADGE_SOLID_CLASS } from "@/components/Badge";
import { StudentActions } from "@/components/StudentActions";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/Table";
import { homeCrumbFor } from "@/lib/navigation";

/** Ro'yxatda ko'rsatiladigan eng ko'p takrorlangan xatolar soni. */
const TOP_MISTAKES = 8;

/**
 * O'quvchi sahifasi — ustoz, direktor va qabulxona uchun BITTA sahifa.
 *
 * Ilgari u faqat `/tutor/oquvchi/[id]` da edi va direktor uni ochib
 * bo'lmasdi (`requireRole("TUTOR")` uni o'z paneliga qaytarardi) — aynan
 * shu sabab direktorning guruh sahifasida alohida, havolasiz jadval
 * (`GroupRosterTable`) saqlanardi. Endi manzil umumiy va o'sha nusxa
 * kerak emas.
 *
 * Progressni qabulxona HAR DOIM ham ko'rmaydi: `receptionSeesProgress`
 * kaliti o'chirilgan bo'lsa u faqat ma'muriy ma'lumotni ko'radi
 * (`canViewStudentProgress`).
 */
export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAnySession();
  const { id: studentId } = await params;

  // "Topilmadi" va "ruxsat yo'q" ataylab bir xil javob beradi — aks holda
  // ID sinab ko'rib, boshqa guruhda qaysi o'quvchilar borligini bilib
  // olish mumkin bo'lardi.
  const context = await getStudentGroupContext(studentId);
  if (!context || !canViewStudent(user, context.student, context.group)) {
    notFound();
  }

  const showProgress = canViewStudentProgress(user, context.student, context.group);
  const canBlock = canManageStudent(user, context.group);
  const canResetPassword = canResetStudentPassword(user, context.group);

  const [detail, mistakes, access] = await Promise.all([
    getStudentDetailForTutor(studentId),
    // Progress ko'rinmasa xatolar ro'yxati ham kerak emas — so'rov
    // umuman yuborilmaydi.
    showProgress ? getStudentMistakes(studentId) : null,
    getStudentAccessForUser(studentId),
  ]);
  if (!detail) notFound();

  // Ko'rsatkichlar tarixdan hisoblanadi — alohida so'rov qo'shilmadi.
  // Qoida panellardagi bilan bir xil: o'rtacha ball FAQAT yakunlangan
  // imtihonlardan (`getStudentDetailForTutor` yakunlanmaganini umuman
  // qaytarmaydi).
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
  const accessLabel = describeStudentAccess(access);

  const topMistakes = mistakes
    ? mistakes.items.filter((m) => !m.isFixed).slice(0, TOP_MISTAKES)
    : [];

  const home = homeCrumbFor(user.role);

  return (
    <div className="space-y-5">
      <Breadcrumb
        items={[
          home,
          { label: context.groupName, href: `/guruh/${context.groupId}` },
          { label: detail.name },
        ]}
      />

      <PageHeader
        title={detail.name}
        description={
          detail.isActive
            ? "O'quvchining progressi, xatolari va urinishlar tarixi."
            : "Hisob bloklangan — o'quvchi tizimga kira olmaydi."
        }
        actions={
          <StudentActions
            studentId={studentId}
            studentName={detail.name}
            isActive={detail.isActive}
            canBlock={canBlock}
            canResetPassword={canResetPassword}
          />
        }
      />

      {/* Guruh va to'lov — ma'muriy ma'lumot, progressdan qat'i nazar
          hamma ko'radi. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
        <span className="text-text-muted">
          Guruh:{" "}
          <Link
            href={`/guruh/${context.groupId}`}
            className="font-semibold text-brand underline-offset-2 hover:underline"
          >
            {detail.groupName ?? context.groupName}
          </Link>
        </span>
        <span className="flex items-center gap-2 text-text-muted">
          To&apos;lov: <Badge variant={accessLabel.variant}>{accessLabel.label}</Badge>
          {accessLabel.detail && (
            <span className="text-text-faint">{accessLabel.detail}</span>
          )}
        </span>
        <span className="flex items-center gap-2 text-text-muted">
          Hisob:{" "}
          <Badge variant={detail.isActive ? "success" : "danger"}>
            {detail.isActive ? "Faol" : "Bloklangan"}
          </Badge>
        </span>
      </div>

      {!showProgress ? (
        // Qabulxona uchun kalit o'chirilgan holat. Bo'sh sahifa emas,
        // sababi bilan tushuntiriladi — aks holda u "yuklanmadimi?" deb
        // o'ylaydi yoki direktorga shikoyat qiladi.
        <Card>
          <EmptyState
            icon="lock"
            title="Natijalar ko'rsatilmaydi"
            description="Direktor sozlamalarida «Qabulxona natijalarni ko'radi» kaliti o'chirilgan. Ma'muriy ma'lumot (guruh, to'lov, hisob holati) yuqorida ko'rinadi."
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            <StatTile
              icon="trophy"
              tone="brand"
              label="O'rtacha ball"
              value={averageScore !== null ? `${averageScore}%` : "—"}
              sub={readiness.label}
            />
            <StatTile
              icon="clipboardCheck"
              tone="info"
              label="Imtihonlar"
              value={examAttempts.length}
            />
            <StatTile
              icon="target"
              tone="purple"
              label="Mashqlar"
              value={practiceAttempts.length}
            />
            <StatTile
              icon="clock"
              tone="warning"
              label="Oxirgi faollik"
              value={lastActivity ? formatRelativeDays(new Date(lastActivity)) : "—"}
              sub={lastActivity ? formatDate(new Date(lastActivity)) : undefined}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle icon="chart">Mavzular bo&apos;yicha o&apos;zlashtirish</CardTitle>
                <CardNote>Eng zaifi birinchi</CardNote>
              </CardHeader>
              {detail.masteryByTopic.length === 0 ? (
                <EmptyState
                  icon="chart"
                  title="Mavzu tahlili hali tayyor emas"
                  description="U yakunlangan imtihon natijalari asosida hisoblanadi — o'quvchi hali imtihon topshirmagan."
                />
              ) : (
                <div className="space-y-3.5">
                  {detail.masteryByTopic.map((topic) => (
                    <div key={topic.topicId} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-[13px] font-medium text-text">
                          {topic.topicName}
                        </span>
                        <span className="font-mono text-[13px] font-semibold tabular-nums text-text-muted">
                          {topic.masteryPercent}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            BADGE_SOLID_CLASS[
                              readinessFromScore(topic.masteryPercent).variant
                            ]
                          )}
                          style={{ width: `${topic.masteryPercent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle icon="alertTriangle">Hali tuzatilmagan xatolar</CardTitle>
                {/* Bu ro'yxat o'quvchining o'z "Xatolarim" bo'limi bilan AYNI
                    funksiyadan oziqlanadi — ustoz va o'quvchi bir xil ro'yxatni
                    ko'radi va dars paytida bir-birini tushunmay qolmaydi. */}
                <CardNote>{mistakes?.stillWrongCount ?? 0} ta</CardNote>
              </CardHeader>
              {!mistakes?.hasFinishedAttempt ? (
                <EmptyState
                  icon="inbox"
                  title="Hali birorta test yakunlanmagan"
                  description="Xatolar ro'yxati yakunlangan urinishlardan yig'iladi."
                />
              ) : topMistakes.length === 0 ? (
                <EmptyState
                  icon="check"
                  title="Tuzatilmagan xato yo'q"
                  description={`Ilgari xato qilganlarini o'rgangan (${mistakes.fixedCount} ta).`}
                />
              ) : (
                <ul className="space-y-2.5">
                  {topMistakes.map((m) => (
                    <li
                      key={m.questionId}
                      className="rounded-md border border-border-subtle bg-bg-subtle p-3.5"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[12px] font-bold text-brand">
                          {m.topicName}
                        </span>
                        {m.wrongCount > 1 && (
                          <span className="shrink-0 font-mono text-[11.5px] font-semibold text-danger">
                            {m.wrongCount} marta
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[13px] leading-snug text-text">{m.text}</p>
                      <p className="mt-1.5 text-[12px] text-success">
                        To&apos;g&apos;ri javob: {m.correctAnswerText}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card className="p-0 sm:p-0">
            <div className="px-5 pt-5 sm:px-6 sm:pt-6">
              <CardHeader>
                <CardTitle icon="clock">Urinishlar tarixi</CardTitle>
                <CardNote>
                  Yakunlanganlari &middot; mashq ham, imtihon ham
                </CardNote>
              </CardHeader>
            </div>
            {detail.attempts.length === 0 ? (
              <EmptyState
                icon="inbox"
                title="Hali yakunlangan urinish yo'q"
                description="O'quvchi test boshlaganda urinishlari shu yerda ko'rinadi."
              />
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
                      <TableCell>
                        <span className="font-mono text-[13px] tabular-nums">
                          {formatDate(new Date(a.date))}
                        </span>
                      </TableCell>
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
        </>
      )}
    </div>
  );
}
