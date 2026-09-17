import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canManageStaff } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { INVALID_EMAIL_MESSAGE, isValidEmail, normalizeEmail } from "@/lib/email";
import { validatePassword } from "@/lib/password";
import { createStaffMember } from "@/services/users";
import { RegistrationError } from "@/services/auth";

/** Faqat shu ikki rol yaratiladi — direktor va owner bu yo'l bilan emas. */
const ALLOWED_ROLES = ["RECEPTION", "TUTOR"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

function toRole(value: unknown): AllowedRole | null {
  return ALLOWED_ROLES.includes(value as AllowedRole) ? (value as AllowedRole) : null;
}

/**
 * Xodim (ustoz yoki qabulxona) qo'shish — FAQAT direktor, o'z
 * tashkilotiga. `organizationId` hech qachon so'rov tanasidan
 * olinmaydi, doim sessiyadan.
 */
export async function POST(request: Request) {
  const user = await getVerifiedSessionUser();
  if (!user?.organizationId || !canManageStaff(user, { organizationId: user.organizationId })) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const role = toRole(body?.role);

  if (!role) {
    return NextResponse.json({ error: "Xodim roli noto'g'ri" }, { status: 400 });
  }
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
    const staff = await createStaffMember({
      name,
      email,
      password,
      role,
      organizationId: user.organizationId,
    });
    return NextResponse.json({ id: staff.id, email: staff.email }, { status: 201 });
  } catch (error) {
    if (error instanceof RegistrationError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    logError(error, { path: "/api/staff", userId: user.id });
    throw error;
  }
}
