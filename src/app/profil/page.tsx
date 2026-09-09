import { notFound } from "next/navigation";
import type { Role } from "@prisma/client";
import { requireAnySession } from "@/lib/auth";
import { getProfile } from "@/services/profile";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { formatDate } from "@/lib/format";
import { ChangePasswordForm } from "./ChangePasswordForm";

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

export default async function ProfilPage() {
  const user = await requireAnySession();
  const profile = await getProfile(user.id);
  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Profil</h1>
        <p className="mt-1 text-sm text-text-muted">
          Hisobingiz ma&apos;lumotlari va parolni o&apos;zgartirish.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hisob ma&apos;lumotlari</CardTitle>
        </CardHeader>

        <div>
          <Row label="Ism" value={profile.name} />
          <Row label="Email" value={profile.email} />
          <Row label="Rol" value={ROLE_LABEL[profile.role]} />
          {profile.organizationName && (
            <Row label="Tashkilot" value={profile.organizationName} />
          )}
          {profile.groupName && <Row label="Guruh" value={profile.groupName} />}
          {profile.tutorName && <Row label="Ustoz" value={profile.tutorName} />}
          <Row label="Ro'yxatdan o'tgan" value={formatDate(profile.createdAt)} />
        </div>

        {/* Ism va email o'zgartirilmaydi — buni ochiq aytish kerak, aks
            holda foydalanuvchi tahrirlash tugmasini qidirib yuradi.
            Email — kirish identifikatori va ustoz o'quvchini aynan shu
            orqali topadi; uni o'quvchining o'zi almashtirsa, ustoz
            hisobni yo'qotib qo'yishi mumkin. */}
        <p className="mt-4 text-xs leading-relaxed text-text-muted">
          Ism yoki emailni o&apos;zgartirish kerak bo&apos;lsa,{" "}
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
