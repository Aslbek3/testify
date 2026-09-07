import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { isDirector } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { INVALID_EMAIL_MESSAGE, isValidEmail, normalizeEmail } from "@/lib/email";
import { validatePassword } from "@/lib/password";
import { createTutor } from "@/services/users";
import { RegistrationError } from "@/services/auth";

export async function POST(request: Request) {
  const user = await getVerifiedSessionUser();
  // Direktor faqat o'z tashkilotiga ustoz qo'sha oladi — organizationId hech
  // qachon so'rov tanasidan olinmaydi, doim sessiyadan.
  if (!user || !isDirector(user) || !user.organizationId) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Ism, email va parol kiritilishi shart" },
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
    const tutor = await createTutor({
      name,
      email,
      password,
      organizationId: user.organizationId,
    });
    return NextResponse.json({ id: tutor.id, email: tutor.email }, { status: 201 });
  } catch (error) {
    if (error instanceof RegistrationError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    logError(error, { path: "/api/tutors", userId: user.id });
    throw error;
  }
}
