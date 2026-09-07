import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageTutor } from "@/lib/permissions";
import { getTutorOrgContext, resetUserPassword } from "@/services/users";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  const { id: tutorId } = await params;
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Parol kamida 8 belgidan iborat bo'lishi kerak" },
      { status: 400 }
    );
  }

  const tutor = await getTutorOrgContext(tutorId);
  if (!tutor) {
    return NextResponse.json({ error: "Ustoz topilmadi" }, { status: 404 });
  }
  if (!canManageTutor(user, tutor)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  await resetUserPassword(tutorId, password);
  return NextResponse.json({ ok: true });
}
