import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/roles";
import type { Role } from "@prisma/client";

const ROLE_PREFIX: Record<string, Role> = {
  owner: "OWNER",
  director: "DIRECTOR",
  tutor: "TUTOR",
  student: "STUDENT",
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segment = pathname.split("/")[1];
  const requiredRole = ROLE_PREFIX[segment];
  if (!requiredRole) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? verifySessionToken(token) : null;

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user.role !== requiredRole) {
    return NextResponse.redirect(new URL(ROLE_HOME[user.role], request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/owner/:path*", "/director/:path*", "/tutor/:path*", "/student/:path*"],
};
