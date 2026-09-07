import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canManageStudent } from "@/lib/permissions";
import { validatePassword } from "@/lib/password";
import { getStudentGroupContext } from "@/services/tutorDashboard";
import { resetUserPassword } from "@/services/users";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getVerifiedSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  const { id: studentId } = await params;
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const context = await getStudentGroupContext(studentId);
  if (!context) {
    return NextResponse.json({ error: "O'quvchi topilmadi" }, { status: 404 });
  }
  if (!canManageStudent(user, context.group)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  await resetUserPassword(studentId, password);
  return NextResponse.json({ ok: true });
}
