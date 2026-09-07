import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canManageOrganizations } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { INVALID_EMAIL_MESSAGE, isValidEmail, normalizeEmail } from "@/lib/email";
import { validatePassword } from "@/lib/password";
import { createDirector } from "@/services/users";
import { RegistrationError } from "@/services/auth";

export async function POST(request: Request) {
  const user = await getVerifiedSessionUser();
  if (!user || !canManageOrganizations(user)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const organizationId =
    typeof body?.organizationId === "string" ? body.organizationId : "";

  if (!name || !email || !password || !organizationId) {
    return NextResponse.json(
      { error: "Ism, email, parol va tashkilot tanlanishi shart" },
      { status: 400 }
    );
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: INVALID_EMAIL_MESSAGE }, { status: 400 });
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  try {
    const director = await createDirector({ name, email, password, organizationId });
    return NextResponse.json({ id: director.id, email: director.email }, { status: 201 });
  } catch (error) {
    if (error instanceof RegistrationError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    logError(error, { path: "/api/directors", userId: user.id });
    throw error;
  }
}
