import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canAssignStudentToGroup } from "@/lib/permissions";
import { getStudentGroupContext } from "@/services/tutorDashboard";
import {
  getGroupPermissionContext,
  moveStudentToGroup,
  UserActionError,
} from "@/services/users";

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
  const groupId = typeof body?.groupId === "string" ? body.groupId : "";
  if (!groupId) {
    return NextResponse.json({ error: "groupId kerak" }, { status: 400 });
  }

  const context = await getStudentGroupContext(studentId);
  if (!context) {
    return NextResponse.json({ error: "O'quvchi topilmadi" }, { status: 404 });
  }

  const targetGroup = await getGroupPermissionContext(groupId);
  if (!targetGroup) {
    return NextResponse.json({ error: "Maqsad guruh topilmadi" }, { status: 404 });
  }

  if (!canAssignStudentToGroup(user, context.student, targetGroup)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
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
