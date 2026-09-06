import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types/auth";
import type { Role } from "@prisma/client";
import { ROLE_HOME } from "@/lib/roles";
import { getUserSessionState } from "@/services/auth";

function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
}

const JWT_SECRET: string = requireJwtSecret();

export const SESSION_COOKIE = "testify_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 1 hafta

export function createSessionToken(user: SessionUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: SESSION_MAX_AGE_SECONDS });
}

export function verifySessionToken(token: string): SessionUser | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (
      typeof payload === "object" &&
      payload !== null &&
      "id" in payload &&
      "role" in payload &&
      "organizationId" in payload
    ) {
      return payload as unknown as SessionUser;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(user: SessionUser) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Dashboard sahifalarida takrorlanadigan tekshiruv: sessiyasiz /login ga,
 * boshqa rolda o'ziga tegishli sahifaga qaytaradi. proxy.ts allaqachon
 * himoya qiladi (Edge'da, faqat imzo/rol) — bu server komponent
 * darajasidagi CHUQUR tekshiruv: bazadagi haqiqiy holat bilan solishtiradi,
 * shunda o'chirilgan/bloklangan yoki paroli/roli o'zgargan foydalanuvchi
 * JWT muddati tugagunga (1 hafta) qadar kirib turishining oldi olinadi.
 */
export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const state = await getUserSessionState(user.id);
  if (!state || state.sessionVersion !== user.sessionVersion || !state.isActive) {
    // Eskirgan cookie'ni shu yerda o'chirib bo'lmaydi — cookies().delete()
    // faqat Server Action/Route Handler'da ishlaydi, Server komponent
    // render'ida emas. Shunga qaramay xavfsiz: bu cookie boshqa hech qanday
    // sahifada tasdiqlanmaydi (har doim shu tekshiruvdan o'tmaydi), keyingi
    // muvaffaqiyatli kirishda esa setSessionCookie uni ustidan yozadi.
    redirect("/login");
  }

  if (state.role !== role) redirect(ROLE_HOME[state.role]);

  return {
    id: user.id,
    role: state.role,
    organizationId: state.organizationId,
    sessionVersion: state.sessionVersion,
  };
}
