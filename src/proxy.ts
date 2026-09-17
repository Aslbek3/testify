import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/roles";
import type { Role } from "@prisma/client";

const ROLE_PREFIX: Record<string, Role> = {
  owner: "OWNER",
  director: "DIRECTOR",
  qabulxona: "RECEPTION",
  tutor: "TUTOR",
  student: "STUDENT",
};

const SHARED_SEGMENTS = ["profil", "bildirishnomalar"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segment = pathname.split("/")[1];
  const requiredRole = ROLE_PREFIX[segment];

  // Profil va bildirishnomalar — barcha rollar uchun umumiy sahifalar
  // (`app/(umumiy)`): rol tekshirilmaydi, faqat sessiya bor-yo'qligi.
  // Shuning uchun ular ROLE_PREFIX'ga kirmaydi, lekin himoyasiz ham
  // qolmasligi kerak.
  const isSharedPage = SHARED_SEGMENTS.includes(segment);
  if (!requiredRole && !isSharedPage) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? verifySessionToken(token) : null;

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (requiredRole && user.role !== requiredRole) {
    return NextResponse.redirect(new URL(ROLE_HOME[user.role], request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/owner/:path*",
    "/director/:path*",
    "/qabulxona/:path*",
    "/tutor/:path*",
    "/student/:path*",
    "/profil/:path*",
    "/bildirishnomalar/:path*",
  ],
};
