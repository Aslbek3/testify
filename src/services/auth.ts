import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
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

  return {
    id: user.id,
    role: user.role,
    organizationId: user.organizationId,
  };
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
  };
}
