import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canManageStudentPayments, isDirector } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { isStudentPaymentMonths } from "@/lib/payments";
import { getStudentGroupContext } from "@/services/tutorDashboard";
import { recordCashPayment, StudentPaymentError } from "@/services/studentPayments";

/** Direktor naqd to'lovni belgilaydi: `{ studentId, months }`. */
export async function POST(request: Request) {
  const user = await getVerifiedSessionUser();
  if (!user || !isDirector(user) || !user.organizationId) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const studentId = typeof body?.studentId === "string" ? body.studentId : "";
  const months = body?.months;
  if (!studentId || !isStudentPaymentMonths(months)) {
    return NextResponse.json({ error: "O'quvchi va muddat (1 yoki 6 oy) kerak" }, { status: 400 });
  }

  // O'quvchi haqiqatan shu direktor tashkilotidanmi — bazadan tekshiriladi.
  // Topilmadi va begona — bir xil javob (ID taxmin qilib bilib bo'lmasin).
  const context = await getStudentGroupContext(studentId);
  const studentOrgId = context?.student.organizationId;
  if (!studentOrgId || !canManageStudentPayments(user, studentOrgId)) {
    return NextResponse.json({ error: "O'quvchi topilmadi" }, { status: 404 });
  }

  try {
    await recordCashPayment({
      organizationId: studentOrgId,
      studentId,
      months,
      reviewerId: user.id,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof StudentPaymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError(error, { path: "/api/director/student-payments/cash", userId: user.id });
    throw error;
  }
}
