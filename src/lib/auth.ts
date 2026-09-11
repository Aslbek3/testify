import jwt from "jsonwebtoken";
import { getSubscriptionState } from "@/lib/subscription";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types/auth";
import type { Role } from "@prisma/client";
import { ROLE_HOME } from "@/lib/roles";
import { getUserSessionState } from "@/services/auth";
import { getStudentAccessForUser } from "@/services/studentPayments";

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
 * CHUQUR sessiya tekshiruvi: JWT imzosidan tashqari bazadagi haqiqiy
 * holatni ham tekshiradi — hisob bloklangan (`isActive: false`),
 * `sessionVersion` mos kelmasa (parol/rol o'zgargan, sessiya bekor
 * qilingan) yoki tashkilotning tarif muddati tugagan bo'lsa null
 * qaytaradi, JWT muddati (1 hafta) tugamagan bo'lsa ham.
 *
 * MUHIM: rol va organizationId JWT'dan EMAS, bazadan olinadi — aks holda
 * roli yoki tashkiloti o'zgargan foydalanuvchi eski token bilan eski
 * huquqlarini saqlab qolar edi.
 *
 * Har bir API route shu orqali o'tishi shart (`getSessionUser` o'zi faqat
 * imzoni tekshiradi va bloklangan hisobni to'xtata olmaydi).
 */
export async function getVerifiedSessionUser(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const state = await getUserSessionState(user.id);
  if (!state || state.sessionVersion !== user.sessionVersion || !state.isActive) {
    return null;
  }

  // Tarif tugagan tashkilot — sessiya darhol bekor bo'ladi, aks holda
  // to'lovni to'xtatgan avtomaktabning allaqachon kirgan foydalanuvchilari
  // token muddati (1 hafta) tugaguncha bemalol ishlab turardi (tekshiruv
  // faqat login'da bor edi).
  //
  // OWNER'ning tashkiloti yo'q (`organizationId: null`) — `organization` ham
  // null bo'lgani uchun bu shart unga hech qachon tegmaydi. Aynan
  // `verifyCredentials`dagi kabi.
  if (getSubscriptionState(state.organization).kind === "blocked") {
    return null;
  }

  return {
    id: user.id,
    role: state.role,
    organizationId: state.organizationId,
    sessionVersion: state.sessionVersion,
  };
}

/**
 * Dashboard sahifalarida takrorlanadigan tekshiruv: sessiyasiz /login ga,
 * boshqa rolda o'ziga tegishli sahifaga qaytaradi. proxy.ts allaqachon
 * himoya qiladi (Edge'da, faqat imzo/rol) — bu esa server komponent
 * darajasidagi chuqur tekshiruv (getVerifiedSessionUser orqali).
 */
/**
 * Rolidan qat'i nazar, kirgan foydalanuvchini qaytaradi.
 *
 * Profil kabi HAMMA uchun umumiy sahifalar uchun — u yerda "qaysi rol"
 * emas, "umuman kirganmi" muhim. `requireRole` bunga yaramaydi: u aniq
 * bitta rolni talab qiladi va boshqasini o'z sahifasiga qaytarib yuboradi.
 */
export async function requireAnySession(): Promise<SessionUser> {
  const user = await getVerifiedSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await getVerifiedSessionUser();
  if (!user) {
    // Eskirgan cookie'ni shu yerda o'chirib bo'lmaydi — cookies().delete()
    // faqat Server Action/Route Handler'da ishlaydi, Server komponent
    // render'ida emas. Shunga qaramay xavfsiz: bu cookie boshqa hech qanday
    // sahifada tasdiqlanmaydi (har doim shu tekshiruvdan o'tmaydi), keyingi
    // muvaffaqiyatli kirishda esa setSessionCookie uni ustidan yozadi.
    redirect("/login");
  }

  if (user.role !== role) redirect(ROLE_HOME[user.role]);

  return user;
}

/**
 * O'quvchi sahifalari uchun: `requireRole("STUDENT")` + to'lov muddati.
 * Muddati (imtiyoz kunlari bilan) o'tgan o'quvchi to'lov sahifasiga
 * yo'naltiriladi.
 *
 * Nega har SAHIFADA, layout'da emas: App Router layout va sahifani
 * PARALLEL chizadi — layout'dagi `redirect()` sahifaning chizilishini
 * to'xtatmaydi va uning mazmuni baribir HTML'ga tushib qoladi (bu
 * tekshirib ko'rilgan). Shuning uchun tekshiruv mazmunni chizadigan
 * joyning o'zida.
 *
 * `/student/tolov` bundan ATAYLAB foydalanmaydi — yopiq o'quvchi aynan
 * o'sha yerda to'laydi. Haqiqiy cheklov baribir serverda: `startAttempt()`
 * yopiq o'quvchiga API orqali ham test boshlatmaydi.
 */
export async function requireActiveStudent(): Promise<SessionUser> {
  const user = await requireRole("STUDENT");
  const access = await getStudentAccessForUser(user.id);
  if (access.kind === "blocked") redirect("/student/tolov");
  return user;
}
