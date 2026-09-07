import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { isDirector } from "@/lib/permissions";
import { INVALID_EMAIL_MESSAGE, isValidEmail, normalizeEmail } from "@/lib/email";
import { validatePassword } from "@/lib/password";
import { registerStudent, RegistrationError } from "@/services/auth";
import { listGroupsForOrganization } from "@/services/directorDashboard";

export async function POST(request: Request) {
  const user = await getVerifiedSessionUser();
  if (!user || !isDirector(user) || !user.organizationId) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const groupId = typeof body?.groupId === "string" ? body.groupId : "";

  if (!name || !email || !password || !groupId) {
    return NextResponse.json(
      { error: "Ism, email, parol va guruh tanlanishi shart" },
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

  // Direktor faqat O'Z tashkilotidagi guruhga o'quvchi qo'sha oladi —
  // taqdim etilgan groupId har doim shu tashkilot guruhlari ro'yxatida
  // bo'lishi tekshiriladi.
  const orgGroups = await listGroupsForOrganization(user.organizationId);
  if (!orgGroups.some((g) => g.id === groupId)) {
    return NextResponse.json(
      { error: "Bu guruh tashkilotingizga tegishli emas" },
      { status: 403 }
    );
  }

  try {
    const student = await registerStudent({ name, email, password, groupId });
    return NextResponse.json({ id: student.id }, { status: 201 });
  } catch (error) {
    if (error instanceof RegistrationError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
