import { requireRole } from "@/lib/auth";
import { StatTile } from "@/components/StatTile";
import { GroupAnalyticsCards } from "@/components/GroupAnalyticsCards";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import {
  getGroupsForTutor,
  getGroupAnalytics,
  getRosterForGroup,
  getRecentExamAttemptCount,
  averageScoreFromRoster,
} from "@/services/tutorDashboard";
import { GroupSelect } from "./GroupSelect";
import { RosterTable } from "./RosterTable";
import { describeStudentAccess } from "@/lib/labels";
import { getStudentAccessMap } from "@/services/studentPayments";
import { NewStudentModal } from "./NewStudentModal";

export default async function TutorPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const user = await requireRole("TUTOR");
  const { group: groupParam } = await searchParams;

  const groups = await getGroupsForTutor(user.id);

  if (groups.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-text">Ustoz paneli</h1>
          <p className="mt-1 text-sm text-text-muted">
            Guruhingiz qaysi mavzularda ko&apos;p xato qilayotganini va har bir
            o&apos;quvchining progressini shu yerdan kuzatasiz.
          </p>
        </div>
        <Card className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border text-xl text-text-muted">
            —
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-text">
              Guruh biriktirilmagan
            </p>
            <p className="max-w-sm text-sm leading-relaxed text-text-muted">
              Sizga hali o&apos;quvchilar guruhi biriktirilmagan. Statistikani
              ko&apos;rish uchun direktoringiz sizga guruh biriktirishi kerak.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const selectedGroup = groups.find((g) => g.id === groupParam) ?? groups[0];

  // Mavzu bo'yicha xato foizi va eng ko'p xato qilingan savollar bitta
  // so'rovdan chiqadi — ilgari ikkalasi alohida chaqirilib, guruhning
  // butun javoblar jadvali har yuklanishda ikki marta tortilardi.
  const [analytics, roster, recentExamCount] = await Promise.all([
    getGroupAnalytics(selectedGroup.id),
    getRosterForGroup(selectedGroup.id),
    getRecentExamAttemptCount(selectedGroup.id),
  ]);
  // To'lov holati — ustoz faqat KO'RADI (nega o'quvchi test ishlay
  // olmayotganini tushunishi uchun), tasdiqlash direktorda.
  const accessMap = await getStudentAccessMap(roster.map((r) => r.studentId));
  const paymentStatus = Object.fromEntries(
    roster.map((r) => [
      r.studentId,
      describeStudentAccess(accessMap.get(r.studentId) ?? { kind: "free" }),
    ])
  );
  // Avtomaktab to'lovni yoqmagan bo'lsa ustun ma'nosiz — ko'rsatilmaydi.
  const showPayments = [...accessMap.values()].some((a) => a.kind !== "free");

  // Hisob direktor guruh sahifasi bilan AYNI funksiyadan — ilgari u shu
  // yerda qo'lda yozilgan edi va ikki panel ajralib ketishi mumkin edi.
  const averageScore = averageScoreFromRoster(roster);
  const activeStudentCount = roster.filter((r) => r.isActive).length;
  const totalAttempts = roster.reduce(
    (sum, r) => sum + r.examAttemptCount + r.practiceAttemptCount,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Ustoz paneli</h1>
          <p className="mt-1 text-sm text-text-muted">
            Guruhingiz qaysi mavzularda ko&apos;p xato qilayotganini va har bir
            o&apos;quvchining progressini shu yerdan kuzatasiz.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {groups.length > 1 && (
            <GroupSelect groups={groups} selectedId={selectedGroup.id} />
          )}
          <NewStudentModal groups={groups} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.6fr_1fr_1fr]">
        <div className="rounded-lg border border-border bg-bg p-6">
          <p className="text-sm text-text-muted">Guruh o&apos;rtacha bali</p>
          <p className="mt-1.5 font-mono text-[52px] font-semibold leading-none text-brand">
            {averageScore !== null ? `${averageScore}%` : "—"}
          </p>
          <p className="mt-2 text-sm text-text-muted">
            Yakunlangan imtihonlar bo&apos;yicha
          </p>
        </div>
        {/* "Faol" so'zi ataylab ishlatilmadi: bu yerdagi son hisob
            bloklanmaganini bildiradi, o'quvchi faol o'qiyotganini emas. */}
        <StatTile label="Bloklanmagan hisoblar" value={activeStudentCount} />
        <StatTile
          label="So'nggi hafta imtihonlar"
          value={recentExamCount}
          sub="Yakunlanganlari"
        />
      </div>

      <GroupAnalyticsCards analytics={analytics} />

      <Card>
        <CardHeader>
          <CardTitle>O&apos;quvchilar</CardTitle>
          <span className="text-sm text-text-muted">
            {totalAttempts} ta yakunlangan urinish · Qatorni bosing —
            o&apos;quvchi sahifasi ochiladi
          </span>
        </CardHeader>
        <p className="mb-3 text-sm text-text-muted">
          Jadvaldagi sonlar faqat SHU guruhdagi urinishlarni ko&apos;rsatadi:
          o&apos;quvchi boshqa guruhdan ko&apos;chirilgan bo&apos;lsa, uning eski
          natijalari eski ustozida qoladi. O&apos;quvchining guruhini
          o&apos;zgartirish kerak bo&apos;lsa, direktorga murojaat qiling.
        </p>
        <RosterTable roster={roster} paymentStatus={showPayments ? paymentStatus : null} />
      </Card>
    </div>
  );
}
