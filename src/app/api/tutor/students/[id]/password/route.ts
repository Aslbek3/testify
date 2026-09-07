import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageStudent } from "@/lib/permissions";
import { getStudentGroupContext } from "@/services/tutorDashboard";
import { resetUserPassword } from "@/services/users";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  const { id: studentId } = await params;
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Parol kamida 8 belgidan iborat bo'lishi kerak" },
      { status: 400 }
    );
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
