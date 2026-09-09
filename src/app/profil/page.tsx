import { notFound } from "next/navigation";
import type { Role } from "@prisma/client";
import { requireAnySession } from "@/lib/auth";
import { getProfile, getStudentProfileStats } from "@/services/profile";
import { readinessFromScore } from "@/lib/readiness";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { StatTile } from "@/components/StatTile";
import { Badge } from "@/components/Badge";
import { formatDate } from "@/lib/format";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { ProfileNameForm } from "./ProfileNameForm";

const ROLE_LABEL: Record<Role, string> = {
  OWNER: "App Owner",
  DIRECTOR: "Direktor",
  TUTOR: "Ustoz",
  STUDENT: "O'quvchi",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border py-3 last:border-0">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-sm font-medium text-text">{value}</span>
    </div>
  );
}

/** "3 kun" / "1 kun" — streak uchun qisqa matn. */
function streakLabel(days: number): string {
  return days === 0 ? "—" : `${days} kun`;
}

export default async function ProfilPage() {
  const user = await requireAnySession();
  const profile = await getProfile(user.id);
  if (!profile) notFound();

  // Ko'rsatkichlar FAQAT o'quvchida: ustoz yoki direktor profilida
  // "o'rtacha ball" va "kun ketma-ket" ma'nosiz bo'lardi.
  const stats =
    profile.role === "STUDENT" ? await getStudentProfileStats(user.id) : null;
  const readiness = stats ? readinessFromScore(stats.averageScore) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Profil</h1>
        <p className="mt-1 text-sm text-text-muted">
          Hisobingiz ma&apos;lumotlari va parolni o&apos;zgartirish.
        </p>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile
              label="O'rtacha ball"
              value={stats.averageScore !== null ? `${stats.averageScore}%` : "—"}
              sub="Imtihonlar bo'yicha"
            />
            <StatTile label="Imtihonlar" value={stats.examCount} sub="Yakunlangan" />
            <StatTile label="Mashqlar" value={stats.practiceCount} sub="Yakunlangan" />
            {/* Ketma-ket kunlar — bu ball emas, ODAT ko'rsatkichi, shuning
                uchun mashq ham, imtihon ham hisobga olinadi. */}
            <StatTile
              label="Kun ketma-ket"
              value={streakLabel(stats.streakDays)}
              sub={stats.streakDays > 0 ? "Davom eting" : "Bugun boshlang"}
            />
          </div>

          {readiness && (
            <Card>
              <CardHeader>
                <CardTitle>Tayyorgarlik holati</CardTitle>
                <span className="text-sm text-text-muted">
                  Yakunlangan imtihonlar bo&apos;yicha
                </span>
              </CardHeader>
              <Badge variant={readiness.variant}>{readiness.label}</Badge>
            </Card>
          )}
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Hisob ma&apos;lumotlari</CardTitle>
        </CardHeader>

        <div>
          <ProfileNameForm currentName={profile.name} />
          <Row label="Email" value={profile.email} />
          <Row label="Rol" value={ROLE_LABEL[profile.role]} />
          {profile.organizationName && (
            <Row label="Tashkilot" value={profile.organizationName} />
          )}
          {profile.groupName && <Row label="Guruh" value={profile.groupName} />}
          {profile.tutorName && <Row label="Ustoz" value={profile.tutorName} />}
          <Row label="Ro'yxatdan o'tgan" value={formatDate(profile.createdAt)} />
        </div>

        {/* Email o'zgartirilmaydi va buni ochiq aytish kerak, aks holda
            foydalanuvchi tahrirlash tugmasini qidirib yuradi. Email —
            kirish identifikatori va ustoz o'quvchini aynan shu orqali
            topadi; uni o'quvchining o'zi almashtirsa, ustoz hisobni
            yo'qotib qo'yishi mumkin. */}
        <p className="mt-4 text-xs leading-relaxed text-text-muted">
          Emailni o&apos;zgartirish kerak bo&apos;lsa,{" "}
          {profile.role === "STUDENT"
            ? "ustozingizga"
            : profile.role === "TUTOR"
              ? "direktoringizga"
              : "administratorga"}{" "}
          murojaat qiling.
        </p>
      </Card>

      <ChangePasswordForm />
    </div>
  );
}
