import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canManageTutor } from "@/lib/permissions";
import { getTutorOrgContext, setUserActive } from "@/services/users";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getVerifiedSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  const { id: tutorId } = await params;
  const body = await request.json().catch(() => null);
  if (typeof body?.isActive !== "boolean") {
    return NextResponse.json({ error: "isActive kerak" }, { status: 400 });
  }

  const tutor = await getTutorOrgContext(tutorId);
  if (!tutor) {
    return NextResponse.json({ error: "Ustoz topilmadi" }, { status: 404 });
  }
  if (!canManageTutor(user, tutor)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  await setUserActive(tutorId, body.isActive);
  return NextResponse.json({ ok: true });
}
