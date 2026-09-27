import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canManageOrganizations } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { INVALID_EMAIL_MESSAGE, isValidEmail, normalizeEmail } from "@/lib/email";
import { validatePassword } from "@/lib/password";
import { createDirector } from "@/services/users";
import { RegistrationError } from "@/services/auth";
import { readJsonBody, readRawString, readString } from "@/lib/requestBody";

export async function POST(request: Request) {
  const user = await getVerifiedSessionUser();
  if (!user || !canManageOrganizations(user)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const body = await readJsonBody(request);
  const name = readString(body, "name");
  const email = normalizeEmail(readRawString(body, "email"));
  const password = readRawString(body, "password");
  const organizationId =
    readRawString(body, "organizationId");

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
