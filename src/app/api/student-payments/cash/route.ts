import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canReviewStudentPayments } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { isStudentPaymentMonths } from "@/lib/payments";
import { getStudentGroupContext } from "@/services/tutorDashboard";
import { recordCashPayment, StudentPaymentError } from "@/services/studentPayments";

/**
 * Naqd to'lovni qayd etish: `{ studentId, months }`.
 *
 * Direktor, va "Qabulxona pul bilan ishlaydi" kaliti yoqilgan bo'lsa
 * qabulxona (`canReviewStudentPayments`).
 */
export async function POST(request: Request) {
  const user = await getVerifiedSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const studentId = typeof body?.studentId === "string" ? body.studentId : "";
  const months = body?.months;
  if (!studentId || !isStudentPaymentMonths(months)) {
    return NextResponse.json({ error: "O'quvchi va muddat (1 yoki 6 oy) kerak" }, { status: 400 });
  }

  // O'quvchi haqiqatan shu tashkilotdanmi — bazadan tekshiriladi.
  // Topilmadi va ruxsat yo'q — bir xil 404 (ID taxmin qilib bilib bo'lmasin).
  const context = await getStudentGroupContext(studentId);
  const studentOrgId = context?.student.organizationId;
  if (!studentOrgId || !canReviewStudentPayments(user, studentOrgId)) {
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
    logError(error, { path: "/api/student-payments/cash", userId: user.id });
    throw error;
  }
}
