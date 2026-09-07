import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canViewStudent, canManageStudent } from "@/lib/permissions";
import {
  getStudentGroupContext,
  getStudentDetailForTutor,
} from "@/services/tutorDashboard";
import { setUserActive } from "@/services/users";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getVerifiedSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  const { id: studentId } = await params;

  const context = await getStudentGroupContext(studentId);
  if (!context) {
    return NextResponse.json({ error: "O'quvchi topilmadi" }, { status: 404 });
  }

  if (!canViewStudent(user, context.student, context.group)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const detail = await getStudentDetailForTutor(studentId);
  if (!detail) {
    return NextResponse.json({ error: "O'quvchi topilmadi" }, { status: 404 });
  }

  return NextResponse.json(detail);
}

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
  if (typeof body?.isActive !== "boolean") {
    return NextResponse.json({ error: "isActive kerak" }, { status: 400 });
  }

  const context = await getStudentGroupContext(studentId);
  if (!context) {
    return NextResponse.json({ error: "O'quvchi topilmadi" }, { status: 404 });
  }
  if (!canManageStudent(user, context.group)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  await setUserActive(studentId, body.isActive);
  return NextResponse.json({ ok: true });
}
