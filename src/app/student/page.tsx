import Link from "next/link";
import { requireActiveStudent } from "@/lib/auth";
import { StatTile } from "@/components/StatTile";
import { Button } from "@/components/Button";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Badge, BADGE_SOLID_CLASS } from "@/components/Badge";
import type { BadgeVariant } from "@/components/Badge";
import { cn } from "@/lib/cn";
import {
  getStudentOverview,
  getMasteryByTopic,
  getAttemptHistory,
} from "@/services/studentDashboard";
import { finalizeExpiredAttempts } from "@/services/attempts";
import { readinessFromScore } from "@/lib/readiness";
import { ProgressRing } from "./ProgressRing";
import { AttemptHistoryTable } from "./AttemptHistoryTable";

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

export default async function StudentPage() {
  const user = await requireActiveStudent();

  // Yorliq yopilib tashlab ketilgan imtihonlarni server tomonda hech kim
  // yopmaydi — shuning uchun panel yuklanishida "yalqov" yakunlaymiz.
  // Statistikani o'qishdan OLDIN turishi shart, aks holda endigina yopilgan
  // urinish shu sahifada hali ko'rinmay qoladi. Yakunlash faqat o'quvchining
  // o'zi ilovaga kirganda sodir bo'ladi: ustoz uni shu paytgacha
  // statistikada ko'rmasligi mumkin.
  await finalizeExpiredAttempts(user.id);

  const [overview, mastery, history] = await Promise.all([
    getStudentOverview(user.id),
    getMasteryByTopic(user.id),
    getAttemptHistory(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">O&apos;quvchi paneli</h1>
          <p className="mt-1 text-sm text-text-muted">
            O&apos;zingizning tayyorgarlik darajangiz, mavzular bo&apos;yicha bilim
            darajasi va urinishlar tarixi shu yerda.
          </p>
        </div>
        <Link href="/student/mashq">
          <Button type="button">Test boshlash</Button>
        </Link>
      </div>

      <Card>
          <div className="flex flex-wrap items-center gap-8">
            <ProgressRing score={overview.overallScore} />
            <div className="grid flex-1 grid-cols-2 gap-4 sm:max-w-md">
              {/* "Jami" emas, "Yakunlangan" — ustoz jadvalidagi
                  imtihon/mashq sonlari ham faqat yakunlanganlarni sanaydi.
                  Ochib tashlab ketilgan urinish o'quvchiga natija bermaydi. */}
              <StatTile
                label="Yakunlangan urinishlar"
                value={overview.finishedAttemptCount}
              />
              <StatTile label="Guruh" value={overview.groupName ?? "—"} />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mavzular bo&apos;yicha bilim darajasi</CardTitle>
            {/* Ma'lumot manbasi ochiq yozilgan — aks holda o'quvchi mashq
                natijalari qayerdaligini so'raydi. */}
            <span className="text-sm text-text-muted">
              Imtihonlar bo&apos;yicha · javobsiz qolgan savol xato deb sanaladi
            </span>
          </CardHeader>

          {mastery.length === 0 ? (
            <p className="text-sm text-text-muted">
              Imtihon topshirilmagan — mavzu tahlili imtihon natijalari asosida
              hisoblanadi.
            </p>
          ) : (
            <div className="space-y-3">
              {mastery.map((topic) => {
                const variant = masteryVariant(topic.masteryPercent);
                return (
                  <div key={topic.topicId} className="flex items-center gap-4">
                    <span className="w-48 shrink-0 truncate text-sm text-text">
                      {topic.topicName}
                    </span>
                    <div className="h-2 flex-1 rounded-full bg-bg-subtle">
                      <div
                        className={cn("h-2 rounded-full", BADGE_SOLID_CLASS[variant])}
                        style={{ width: `${topic.masteryPercent}%` }}
                      />
                    </div>
                    <Badge variant={variant}>
                      <span className="font-mono">{topic.masteryPercent}%</span>
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Urinishlar tarixi</CardTitle>
          </CardHeader>

          {history.length === 0 ? (
            <p className="text-sm text-text-muted">Hali urinish qilinmagan.</p>
          ) : (
            <AttemptHistoryTable history={history} />
          )}
        </Card>
    </div>
  );
}
