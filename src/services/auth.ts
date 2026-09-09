import bcrypt from "bcryptjs";
import { getSubscriptionState } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { OrganizationStatus, Role } from "@prisma/client";
import { normalizeEmail } from "@/lib/email";
import type { SessionUser } from "@/types/auth";

const SALT_ROUNDS = 10;

/**
 * Mavjud bo'lmagan email uchun ham bcrypt ishlashi shart bo'lgan "qo'g'irchoq"
 * hash. Aks holda javob vaqti hisobning bor-yo'qligini oshkor qilardi:
 * mavjud email uchun `bcrypt.compare` ~90 ms ishlaydi, mavjud bo'lmagani
 * uchun esa umuman bajarilmay ~5 ms da qaytardi — hujumchi shu farq bilan
 * qaysi email ro'yxatdan o'tganini bemalol sanab chiqa olardi.
 *
 * Qiymat ataylab konstanta (ishga tushishda hisoblanmaydi) va SALT_ROUNDS
 * bilan bir xil (10) raundda yaratilgan — vaqt haqiqiy tekshiruvga mos
 * kelishi uchun. Bu hech qanday hisobning paroli emas.
 */
const DUMMY_PASSWORD_HASH =
  "$2b$10$esX5t7eqogxsJddaZ.5.J.6fItbrj8Otb/S96dcembqDUV3SKFSnW";

/**
 * Parol to'g'ri, lekin tashkilotning tarif muddati tugagan — bu holat
 * "Email yoki parol noto'g'ri"dan farqli ravishda tushunarli xabar bilan
 * ko'rsatiladi, chunki bu xabarni faqat parolini to'g'ri kiritgan haqiqiy
 * foydalanuvchi ko'radi (xavfsizlik nuqtai nazaridan hech narsa oshkor
 * qilinmaydi — parolni taxmin qilayotgan kimsa bu xabarga hech qachon
 * yetib bormaydi).
 */
export class OrganizationExpiredError extends Error {}

export async function verifyCredentials(
  email: string,
  password: string
): Promise<SessionUser | null> {
  // Qidiruv ham hisob yaratishdagi kabi normallashtirilgan email bo'yicha
  // ketadi — aks holda `Ali@x.com` deb yaratilgan hisob egasi `ali@x.com`
  // deb kirganda hech qachon topilmas edi.
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    include: {
      organization: { select: { status: true, subscriptionEndsAt: true } },
    },
  });
  if (!user) {
    // Natija ataylab tashlab yuboriladi — bu chaqiruv faqat javob vaqtini
    // mavjud hisob bilan tenglashtirish uchun (DUMMY_PASSWORD_HASH izohiga qara).
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) return null;

  // Bloklangan hisob — "Email yoki parol noto'g'ri" bilan bir xil umumiy
  // rad javobi (hisob holatini oshkor qilmaslik uchun alohida xabar yo'q).
  if (!user.isActive) return null;

  // OWNER'ning tashkiloti yo'q (organizationId null), shuning uchun bu
  // tekshiruv tabiiy ravishda faqat tashkilotga bog'liq rollarga tegadi.
  // Ikkita sabab: owner qo'lda to'xtatgan (`EXPIRED`) yoki obuna muddati
  // imtiyoz kunlari bilan birga o'tib ketgan. Ikkalasi ham
  // `getSubscriptionState` da hisoblanadi — login va har so'rovdagi
  // tekshiruv bir xil qoidada ishlashi uchun.
  if (getSubscriptionState(user.organization).kind === "blocked") {
    throw new OrganizationExpiredError(
      "Tashkilotingizning tarif muddati tugagan. Iltimos, administratoringiz bilan bog'laning."
    );
  }

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
  organization: {
    status: OrganizationStatus;
    subscriptionEndsAt: Date | null;
  } | null;
} | null;

/**
 * requireRole() har sahifa yuklanishida shu orqali bazadagi haqiqiy
 * holatni tekshiradi — JWT o'zi hech qachon qayta tekshirilmagani uchun
 * o'chirilgan/bloklangan/roli o'zgargan foydalanuvchi token muddati
 * tugagunga (1 hafta) qadar kirib turishi mumkin edi. Faqat shu tekshiruv
 * uchun zarur maydonlar tanlanadi — har sahifada qo'shimcha so'rov
 * narxini minimal ushlab turish uchun.
 *
 * Tashkilot `status`i ham shu yerda olinadi: tarif tugagani ilgari FAQAT
 * login paytida tekshirilardi, ya'ni to'lovni to'xtatgan avtomaktabning
 * allaqachon kirgan xodim/o'quvchilari JWT muddati (1 hafta) tugaguncha
 * ishlashda davom etardi. Bu qo'shimcha SO'ROV emas, o'sha so'rovdagi JOIN —
 * narxi deyarli nol.
 */
export async function getUserSessionState(userId: string): Promise<UserSessionState> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      organizationId: true,
      sessionVersion: true,
      isActive: true,
      organization: { select: { status: true, subscriptionEndsAt: true } },
    },
  });
}

/**
 * Foydalanuvchining barcha joriy sessiyalarini bekor qiladi —
 * `sessionVersion` oshirilganda eski JWT `getVerifiedSessionUser` (va u
 * orqali `requireRole`) tekshiruvidan o'tmay qoladi.
 *
 * Logout uchun kerak: ilgari chiqish faqat cookie'ni o'chirardi, token esa
 * yana bir hafta amal qilaverardi — umumiy kompyuterda cookie nusxalab
 * olingan bo'lsa, "Chiqish" tugmasi hech narsani himoya qilmasdi.
 *
 * Foydalanuvchi orada o'chirilgan bo'lsa (P2025) jimgina o'tkazib
 * yuboriladi: chiqish jarayoni bunday holatda ham buzilmasligi kerak.
 */
export async function revokeUserSessions(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { sessionVersion: { increment: 1 } },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return;
    }
    throw error;
  }
}

export class RegistrationError extends Error {}

export async function registerStudent(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  groupId: string;
}): Promise<SessionUser> {
  const email = normalizeEmail(input.email);

  const existing = await prisma.user.findUnique({
    where: { email },
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

  // findUnique + create orasidagi poyga: bir vaqtda kelgan ikki so'rov
  // tekshiruvdan ikkalasi ham o'tishi mumkin — yutqazgani xom P2002 bilan
  // 500 bo'lib ketmasligi uchun uni RegistrationError'ga (409) aylantiramiz.
  let user;
  try {
    user = await prisma.user.create({
      data: {
        name: input.name,
        email,
        passwordHash,
        phone: input.phone,
        role: "STUDENT",
        organizationId: group.organizationId,
        studentProfile: {
          create: { groupId: input.groupId },
        },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new RegistrationError("Bu email allaqachon ro'yxatdan o'tgan");
    }
    throw error;
  }

  return {
    id: user.id,
    role: user.role,
    organizationId: user.organizationId,
    sessionVersion: user.sessionVersion,
  };
}
