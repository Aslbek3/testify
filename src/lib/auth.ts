import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { SessionUser } from "@/types/auth";

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
