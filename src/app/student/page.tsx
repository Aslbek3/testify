import Link from "next/link";
import { requireActiveStudent } from "@/lib/auth";
import { Button } from "@/components/Button";
import { Card, CardHeader, CardTitle, CardNote } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge, BADGE_SOLID_CLASS } from "@/components/Badge";
import type { BadgeVariant } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { Icon, type IconName } from "@/components/Icon";
import { cn } from "@/lib/cn";
import {
  getStudentOverview,
  getMasteryByTopic,
  getAttemptHistory,
} from "@/services/studentDashboard";
import { finalizeExpiredAttempts } from "@/services/attempts";
import { listAssignmentsForStudent } from "@/services/assignments";
import { getStudentMistakes } from "@/services/mistakes";
import { getUserName } from "@/services/users";
import { getNextLessonForStudent } from "@/services/lessons";
import { getNextStep } from "@/lib/nextStep";
import { readinessFromScore } from "@/lib/readiness";
import { formatLessonDate, formatTime } from "@/lib/format";
import { ProgressRing } from "./ProgressRing";
import { AttemptHistoryTable } from "./AttemptHistoryTable";
import { StudentAssignmentsCard } from "./StudentAssignmentsCard";

/**
 * Mavzu foizining rangi tayyorgarlik holati bilan AYNI chegaralardan
 * (`readinessFromScore`, u esa `EXAM_PASS_PERCENT` dan) kelib chiqadi.
 *
 * Ilgari bu yerda o'zining 85/65 sehrli raqamlari turardi, `readiness.ts`
 * da esa 90/75. Natijada 86% o'zlashtirilgan mavzu o'quvchining o'zida
 * YASHIL, o'sha o'quvchi ustoz panelida esa SARIQ "Deyarli tayyor" bo'lib
 * ko'rinardi. Endi chegara bitta joyda — o'tish balli o'zgarsa, ikkala
 * panelning rangi ham birga siljiydi.
 */
function masteryVariant(masteryPercent: number): BadgeVariant {
  return readinessFromScore(masteryPercent).variant;
}

/**
 * Test rejimlari. Ro'yxat shu yerda, chunki bu — o'quvchi panelidagi
 * ko'rinish; rejimlarning o'z qoidalari (savol soni, vaqt) har birining
 * sahifasida va `examRules.ts` da qoladi.
 */
const MODES: {
  href: string;
  label: string;
  description: string;
  icon: IconName;
  tone: string;
}[] = [
  {
    href: "/student/bilet",
    label: "Biletlar",
    description: "Imtihon formatidagi tayyor biletlar, doim bir xil tartibda.",
    icon: "ticket",
    tone: "bg-brand-soft text-brand",
  },
  {
    href: "/student/mashq",
    label: "Mashq",
    description: "Taymersiz. Javob darhol tekshiriladi va izohi ko'rsatiladi.",
    icon: "target",
    tone: "bg-info-soft text-info",
  },
  {
    href: "/student/maraton",
    label: "Maraton",
    description: "Uzoq seriya — tezlik va diqqatni sinash uchun.",
    icon: "flame",
    tone: "bg-purple-soft text-purple",
  },
  {
    href: "/student/imtihon",
    label: "Imtihon",
    description: "Haqiqiy imtihon sharoiti: vaqt cheklangan, izoh yo'q.",
    icon: "clipboardCheck",
    tone: "bg-warning-soft text-warning",
  },
];

/**
 * Halqa yonidagi kichik ko'rsatkich. `StatTile` emas: u o'z chegarasi va
 * soyasi bilan keladi, bu yerda esa blok allaqachon kartochka ICHIDA turibdi
 * va ikkinchi ramka ortiqcha ko'rinardi.
 */
function MiniStat({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md bg-surface-2/70 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted">
        <Icon name={icon} className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 truncate font-display text-lg font-bold tabular-nums text-text">
        {value}
      </p>
    </div>
  );
}

export default async function StudentPage({
  searchParams,
}: {
  searchParams: Promise<{ xato?: string }>;
}) {
  const user = await requireActiveStudent();
  // Vazifani boshlab bo'lmaganda (masalan muddati o'tgan) test sahifasi
  // shu yerga sababi bilan qaytaradi — `/student/test` ga qara.
  const { xato } = await searchParams;

  // Yorliq yopilib tashlab ketilgan imtihonlarni server tomonda hech kim
  // yopmaydi — shuning uchun panel yuklanishida "yalqov" yakunlaymiz.
  // Statistikani o'qishdan OLDIN turishi shart, aks holda endigina yopilgan
  // urinish shu sahifada hali ko'rinmay qoladi. Yakunlash faqat o'quvchining
  // o'zi ilovaga kirganda sodir bo'ladi: ustoz uni shu paytgacha
  // statistikada ko'rmasligi mumkin.
  await finalizeExpiredAttempts(user.id);

  // Ism sessiyada saqlanmaydi (JWT faqat o'zgarmaydigan identifikatorlarni
  // olib yuradi) — shuning uchun qolgan so'rovlar bilan birga o'qiladi.
  const [overview, mastery, history, assignments, mistakes, userName, nextLesson] =
    await Promise.all([
      getStudentOverview(user.id),
      getMasteryByTopic(user.id),
      getAttemptHistory(user.id),
      listAssignmentsForStudent(user.id),
      getStudentMistakes(user.id),
      getUserName(user.id),
      getNextLessonForStudent(user.id),
    ]);

  // Ro'yxat o'sish bo'yicha saralangan, ya'ni birinchisi — eng zaif mavzu.
  const nextStep = getNextStep({
    hasFinishedAttempt: overview.finishedAttemptCount > 0,
    stillWrongCount: mistakes.stillWrongCount,
    weakestTopic: mastery[0] ?? null,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="O'quvchi paneli"
        title={userName ? `Salom, ${userName}` : "O'quvchi paneli"}
        description="Tayyorgarlik darajangiz, mavzular bo'yicha bilim va urinishlar tarixi shu yerda."
      />

      {xato && (
        <p className="flex items-start gap-2 rounded-md border border-danger/25 bg-danger-soft px-4 py-3 text-[13px] text-danger">
          <Icon name="alertTriangle" className="mt-0.5 h-4 w-4" />
          {xato}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(270px,0.65fr)]">
        <div className="space-y-5">
          {/* Sahifadagi YAGONA to'q blok: o'quvchi ekranni ochganda birinchi
              savoli "endi nima qilay?" — foiz emas. Shuning uchun keyingi
              qadam boshqa hamma narsadan kuchliroq ko'rinadi. */}
          <div className="relative overflow-hidden rounded-xl bg-navy p-6 text-white shadow-raised sm:p-7">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full border border-brand/30"
            />
            <p className="text-[12px] font-bold text-brand">
              Keyingi qadam
            </p>
            <h2 className="mt-2 max-w-md font-display text-[22px] font-bold leading-[1.15] tracking-[-0.04em] sm:text-[26px]">
              {nextStep.title}
            </h2>
            <p className="mt-2.5 max-w-md text-[13px] leading-relaxed text-white/65">
              {nextStep.description}
            </p>
            <Link href={nextStep.href} className="mt-5 inline-block">
              <Button type="button" iconEnd="arrowRight">
                {nextStep.action}
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {MODES.map((mode) => (
              <Link
                key={mode.href}
                href={mode.href}
                // Bosiladigan kartochka — hover javobi bo'lishi kerak.
                // (Passiv `Card` da hech qanday hover-effekt yo'q, bu
                // istisno ataylab: element havola, bezak emas.)
                className="flex flex-col rounded-lg border border-border bg-bg p-4 shadow-card transition-all hover:border-brand/40 hover:shadow-raised sm:p-5"
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-sm",
                    mode.tone
                  )}
                >
                  <Icon name={mode.icon} />
                </span>
                <span className="mt-3.5 font-display text-sm font-bold text-text">
                  {mode.label}
                </span>
                <span className="mt-1 text-[11px] leading-snug text-text-muted">
                  {mode.description}
                </span>
                <span className="mt-auto inline-flex items-center gap-1 pt-3.5 text-[11px] font-bold text-brand">
                  Boshlash
                  <Icon name="arrowRight" className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          {/* Keyingi dars — Tayyorgarlikdan OLDIN: o'quvchining eng tez-tez
              beradigan savoli "dars qachon?", foiz esa undan keyin keladi.
              Jadval tuzilmagan bo'lsa blok umuman chizilmaydi — bo'sh
              "dars yo'q" kartochkasi faqat joy olardi. */}
          {nextLesson && (
            <Card className="border-brand/25 bg-brand-soft">
              <div className="flex items-start gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-brand">
                  <Icon name="calendar" className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-brand">Keyingi dars</p>
                  <p className="mt-1 font-display text-[15px] font-bold text-text">
                    {formatLessonDate(nextLesson.startsAt)}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-text-muted">
                    <span className="font-mono tabular-nums">
                      {formatTime(nextLesson.startsAt)}
                    </span>
                    {" · "}
                    {nextLesson.durationMin} daqiqa
                    {nextLesson.topicName && ` · ${nextLesson.topicName}`}
                  </p>
                  {nextLesson.note && (
                    <p className="mt-1 text-[12px] text-text-faint">{nextLesson.note}</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Tayyorgarlik</CardTitle>
            <CardNote>Imtihonlar bo&apos;yicha</CardNote>
          </CardHeader>

          <div className="flex justify-center py-1">
            <ProgressRing score={overview.overallScore} />
          </div>

          <p className="mt-4 text-center text-[12px] leading-relaxed text-text-muted">
            Faqat imtihon urinishlari hisobga olinadi — mashq ballari bu foizga
            qo&apos;shilmaydi.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {/* "Jami" emas, "Yakunlangan" — ustoz jadvalidagi
                imtihon/mashq sonlari ham faqat yakunlanganlarni sanaydi.
                Ochib tashlab ketilgan urinish o'quvchiga natija bermaydi. */}
            <MiniStat
              icon="clipboardCheck"
              label="Yakunlangan"
              value={overview.finishedAttemptCount}
            />
            <MiniStat icon="users" label="Guruh" value={overview.groupName ?? "—"} />
          </div>

          {mistakes.stillWrongCount > 0 && (
            <Link
              href="/student/xatolarim"
              className="mt-3 flex items-center gap-2.5 rounded-md bg-warning-soft px-3.5 py-3 transition-colors hover:brightness-[0.97]"
            >
              <Icon name="alertTriangle" className="h-4 w-4 text-warning" />
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-bold text-text">
                  {mistakes.stillWrongCount} ta xato hal qilinmagan
                </span>
                <span className="block text-[11px] text-text-muted">
                  Xatolarim bo&apos;limida ustida ishlang
                </span>
              </span>
              <Icon name="chevronRight" className="h-4 w-4 text-text-faint" />
            </Link>
          )}
          </Card>
        </div>
      </div>

      <StudentAssignmentsCard assignments={assignments} />

      <Card>
        <CardHeader>
          <CardTitle icon="chart">Mavzular bo&apos;yicha bilim darajasi</CardTitle>
          {/* Ma'lumot manbasi ochiq yozilgan — aks holda o'quvchi mashq
              natijalari qayerdaligini so'raydi. */}
          <CardNote>
            Imtihonlar bo&apos;yicha · javobsiz qolgan savol xato deb sanaladi
          </CardNote>
        </CardHeader>

        {mastery.length === 0 ? (
          <EmptyState
            icon="chart"
            title="Mavzu tahlili hali tayyor emas"
            description="U imtihon natijalari asosida hisoblanadi — hali birorta imtihon topshirilmagan."
            action={{ href: "/student/imtihon", label: "Imtihon topshirish" }}
          />
        ) : (
          <div className="space-y-4">
            {mastery.map((topic) => {
              const variant = masteryVariant(topic.masteryPercent);
              return (
                <div key={topic.topicId} className="space-y-2">
                  {/* Nom va foiz bitta qatorda, shkala ostida: ilgari uchalasi
                      yonma-yon turardi va 390px ekranda mavzu nomi
                      ("Svetofor va nazoratchi ishoralari") kesilib qolardi. */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-[13px] font-medium text-text">
                      {topic.topicName}
                    </span>
                    <Badge variant={variant} dot={false}>
                      <span className="tabular-nums">{topic.masteryPercent}%</span>
                    </Badge>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={cn("h-full rounded-full", BADGE_SOLID_CLASS[variant])}
                      style={{ width: `${topic.masteryPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle icon="clock">Urinishlar tarixi</CardTitle>
          {history.length > 0 && (
            <CardNote>{history.length} ta yakunlangan urinish</CardNote>
          )}
        </CardHeader>

        {history.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="Hali urinish qilinmagan"
            description="Birinchi mashqdan boshlang — u taymersiz va javob darhol tekshiriladi."
            action={{ href: "/student/mashq", label: "Mashqni boshlash" }}
          />
        ) : (
          <AttemptHistoryTable history={history} />
        )}
      </Card>
    </div>
  );
}
