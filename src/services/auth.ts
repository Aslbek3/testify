import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import type { SessionUser } from "@/types/auth";

const SALT_ROUNDS = 10;

export async function verifyCredentials(
  email: string,
  password: string
): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) return null;

  // Bloklangan hisob — "Email yoki parol noto'g'ri" bilan bir xil umumiy
  // rad javobi (hisob holatini oshkor qilmaslik uchun alohida xabar yo'q).
  if (!user.isActive) return null;

  return {
    id: user.id,
    role: user.role,
    organizationId: user.organizationId,
    sessionVersion: user.sessionVersion,
  };
}

export type UserSessionState = {
  role: Role;
  organizationId: string | null;
  sessionVersion: number;
  isActive: boolean;
} | null;

/**
 * requireRole() har sahifa yuklanishida shu orqali bazadagi haqiqiy
 * holatni tekshiradi — JWT o'zi hech qachon qayta tekshirilmagani uchun
 * o'chirilgan/bloklangan/roli o'zgargan foydalanuvchi token muddati
 * tugagunga (1 hafta) qadar kirib turishi mumkin edi. Faqat shu tekshiruv
 * uchun zarur 4 ta maydon tanlanadi — har sahifada qo'shimcha so'rov
 * narxini minimal ushlab turish uchun.
 */
export async function getUserSessionState(userId: string): Promise<UserSessionState> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, organizationId: true, sessionVersion: true, isActive: true },
  });
}

export class RegistrationError extends Error {}

export async function registerStudent(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  groupId: string;
}): Promise<SessionUser> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw new RegistrationError("Bu email allaqachon ro'yxatdan o'tgan");
  }

  const group = await prisma.group.findUnique({
    where: { id: input.groupId },
    select: { organizationId: true },
  });
  if (!group) {
    throw new RegistrationError("Tanlangan guruh topilmadi");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      phone: input.phone,
      role: "STUDENT",
      organizationId: group.organizationId,
      studentProfile: {
        create: { groupId: input.groupId },
      },
    },
  });

  return {
    id: user.id,
    role: user.role,
    organizationId: user.organizationId,
    sessionVersion: user.sessionVersion,
  };
}
