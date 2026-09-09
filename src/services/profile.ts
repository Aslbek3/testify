import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resetUserPassword } from "@/services/users";

export class ProfileError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type Profile = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
  /** OWNER'da tashkilot yo'q — u butun platformaga tegishli. */
  organizationName: string | null;
  /** Faqat o'quvchida to'ladi. */
  groupName: string | null;
  tutorName: string | null;
};

/**
 * Foydalanuvchining o'z ma'lumotlari.
 *
 * Guruh va ustoz faqat o'quvchida bo'ladi, shuning uchun `studentProfile`
 * ixtiyoriy bog'lanish sifatida o'qiladi — boshqa rollarda u `null`.
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      organization: { select: { name: true } },
      studentProfile: {
        select: {
          group: { select: { name: true, tutor: { select: { name: true } } } },
        },
      },
    },
  });
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    organizationName: user.organization?.name ?? null,
    groupName: user.studentProfile?.group.name ?? null,
    tutorName: user.studentProfile?.group.tutor.name ?? null,
  };
}

/**
 * Foydalanuvchi O'Z parolini o'zgartiradi.
 *
 * Joriy parol MAJBURIY tekshiriladi — sessiyaning o'zi yetarli emas.
 * Sabab: o'g'irlangan yoki ochiq qolgan cookie bilan kelgan kimsa parolni
 * almashtirib, haqiqiy egasini o'z hisobidan butunlay chiqarib yuborishi
 * mumkin bo'lardi. Joriy parolni so'rash bu yo'lni yopadi.
 *
 * `resetUserPassword` qayta ishlatiladi (ustoz o'quvchining parolini
 * tiklashda ham o'sha ishlatiladi) — hash va `sessionVersion` oshirish
 * mantig'i yagona joyda qolsin.
 *
 * @returns yangi `sessionVersion` — route uni cookie'ga qayta yozishi
 * kerak, aks holda parolni o'zgartirgan odamning O'ZI ham darhol tizimdan
 * chiqib ketardi (boshqa qurilmalardagi sessiyalar esa ataylab o'ladi).
 */
export async function changeOwnPassword(input: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<{ sessionVersion: number }> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { passwordHash: true },
  });
  if (!user) throw new ProfileError("Foydalanuvchi topilmadi", 404);

  const matches = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!matches) {
    throw new ProfileError("Joriy parol noto'g'ri", 400);
  }

  // Bir xil parolni qayta o'rnatish ma'nosiz, lekin zararli tomoni ham bor:
  // `sessionVersion` oshgani uchun foydalanuvchi boshqa qurilmalardagi
  // sessiyalarini hech qanday sababsiz yo'qotardi.
  if (input.currentPassword === input.newPassword) {
    throw new ProfileError("Yangi parol joriy paroldan farq qilishi kerak", 400);
  }

  const updated = await resetUserPassword(input.userId, input.newPassword);
  return { sessionVersion: updated.sessionVersion };
}
