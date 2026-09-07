import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { RegistrationError } from "@/services/auth";

const SALT_ROUNDS = 10;

async function createStaffUser(input: {
  name: string;
  email: string;
  password: string;
  role: "DIRECTOR" | "TUTOR";
  organizationId: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new RegistrationError("Bu email allaqachon mavjud");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { id: true },
  });
  if (!organization) {
    throw new RegistrationError("Tashkilot topilmadi");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      organizationId: input.organizationId,
    },
  });
}

/** Owner tomonidan bir tashkilotga Direktor tayinlash uchun. */
export function createDirector(input: {
  name: string;
  email: string;
  password: string;
  organizationId: string;
}) {
  return createStaffUser({ ...input, role: "DIRECTOR" });
}

/** Direktor tomonidan o'z tashkilotiga Ustoz qo'shish uchun. */
export function createTutor(input: {
  name: string;
  email: string;
  password: string;
  organizationId: string;
}) {
  return createStaffUser({ ...input, role: "TUTOR" });
}

/** Bitta marta ishlaydigan create-owner skripti uchun — tashkilotga bog'lanmaydi. */
export async function createOwner(input: {
  name: string;
  email: string;
  password: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new RegistrationError("Bu email allaqachon mavjud");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: "OWNER",
      organizationId: null,
    },
  });
}

/** create-owner skriptida bazada allaqachon Owner bor-yo'qligini ogohlantirish uchun. */
export async function countOwners(): Promise<number> {
  return prisma.user.count({ where: { role: "OWNER" } });
}

/** AppShell sidebar footerida foydalanuvchi ismini ko'rsatish uchun. */
export async function getUserName(id: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id }, select: { name: true } });
  return user?.name ?? null;
}

/** Ustozni bloklash/tiklash uchun ruxsat tekshiruvida (canManageTutor) kerak. */
export async function getTutorOrgContext(
  tutorId: string
): Promise<{ organizationId: string | null } | null> {
  const tutor = await prisma.user.findUnique({
    where: { id: tutorId, role: "TUTOR" },
    select: { organizationId: true },
  });
  return tutor;
}

/** O'quvchini guruhga ko'chirish ruxsatini tekshirishda (canAssignStudentToGroup) kerak. */
export async function getGroupPermissionContext(
  groupId: string
): Promise<{ tutorId: string; organizationId: string } | null> {
  return prisma.group.findUnique({
    where: { id: groupId },
    select: { tutorId: true, organizationId: true },
  });
}

/**
 * Hisobni bloklash/tiklash. Bloklaganda sessionVersion oshiriladi —
 * shunda foydalanuvchining joriy sessiyasi (token muddati hali
 * tugamagan bo'lsa ham) requireRole orqali darhol bekor bo'ladi.
 * Tiklashda esa oshirish shart emas — zararli faol sessiya yo'q.
 */
export async function setUserActive(userId: string, isActive: boolean) {
  return prisma.user.update({
    where: { id: userId },
    data: isActive ? { isActive: true } : { isActive: false, sessionVersion: { increment: 1 } },
  });
}

/**
 * Foydalanuvchi parolini boshqa birov (ustoz o'z o'quvchisiga, direktor
 * o'z ustoziga) tiklaydi. sessionVersion oshiriladi — eski parol bilan
 * ochilgan har qanday joriy sessiya requireRole orqali darhol bekor bo'ladi.
 */
export async function resetUserPassword(userId: string, newPassword: string) {
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });
}

export class UserActionError extends Error {}

/**
 * O'quvchini boshqa guruhga ko'chiradi. Maqsad guruh o'quvchi bilan bir
 * tashkilotda ekani bu yerda, ruxsat tekshiruvidan mustaqil ravishda ham
 * qayta tekshiriladi (himoyaning ikkinchi qatlami). Attempt yozuvlaridagi
 * groupId — urinish boshlangan paytdagi guruh instantanasi — ataylab
 * o'zgartirilmaydi, shuning uchun o'quvchining eski urinishlar tarixi
 * o'sha paytdagi guruhni ko'rsatishda davom etadi.
 */
export async function moveStudentToGroup(studentId: string, targetGroupId: string) {
  const [student, targetGroup] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId }, select: { organizationId: true } }),
    prisma.group.findUnique({ where: { id: targetGroupId }, select: { organizationId: true } }),
  ]);
  if (!student) throw new UserActionError("O'quvchi topilmadi");
  if (!targetGroup) throw new UserActionError("Guruh topilmadi");
  if (student.organizationId !== targetGroup.organizationId) {
    throw new UserActionError("Maqsad guruh o'quvchi bilan bir tashkilotda emas");
  }

  return prisma.studentProfile.update({
    where: { userId: studentId },
    data: { groupId: targetGroupId },
  });
}
