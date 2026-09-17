import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canAssignStudentToGroup } from "@/lib/permissions";
import { getStudentGroupContext } from "@/services/tutorDashboard";
import {
  getGroupPermissionContext,
  moveStudentToGroup,
  UserActionError,
} from "@/services/users";

/**
 * O'quvchini boshqa guruhga ko'chirish — direktor va qabulxona.
 *
 * Ustoz bu yerga hech qanday kalit bilan ham kirmaydi, sababi
 * `canAssignStudentToGroup` izohida (tuzatilgan xavfsizlik teshigi).
 */
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
  const groupId = typeof body?.groupId === "string" ? body.groupId : "";
  if (!groupId) {
    return NextResponse.json({ error: "groupId kerak" }, { status: 400 });
  }

  const context = await getStudentGroupContext(studentId);
  const targetGroup = context ? await getGroupPermissionContext(groupId) : null;

  // Ruxsati bo'lmagan chaqiruvchiga "bor/yo'q" farqi ko'rsatilmaydi —
  // topilmadi ham, ruxsat yo'q ham bir xil 404 (resurs mavjudligini
  // aniqlash uchun oracle bo'lib qolmasligi uchun).
  if (
    !context ||
    !targetGroup ||
    !canAssignStudentToGroup(user, context.student, targetGroup)
  ) {
    return NextResponse.json({ error: "O'quvchi yoki guruh topilmadi" }, { status: 404 });
  }

  try {
    await moveStudentToGroup(studentId, groupId);
  } catch (error) {
    if (error instanceof UserActionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  return NextResponse.json({ ok: true });
}
