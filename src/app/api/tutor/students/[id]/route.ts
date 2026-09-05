import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canViewStudent } from "@/lib/permissions";
import {
  getStudentGroupContext,
  getStudentDetailForTutor,
} from "@/services/tutorDashboard";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
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
