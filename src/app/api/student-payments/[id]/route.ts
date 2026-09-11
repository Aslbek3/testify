import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canManageStudentPayments } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import {
  confirmStudentPayment,
  getStudentPaymentRef,
  rejectStudentPayment,
  StudentPaymentError,
} from "@/services/studentPayments";

/** Direktor to'lovni tasdiqlaydi yoki rad etadi: `{ action, reason? }`. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getVerifiedSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const { id } = await params;
  const payment = await getStudentPaymentRef(id);
  // Topilmadi va ruxsat yo'q — bir xil javob: boshqa avtomaktab
  // to'lovining bor-yo'qligini ID taxmin qilib bilib bo'lmasin.
  if (!payment || !canManageStudentPayments(user, payment.organizationId)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action;
  const reason = typeof body?.reason === "string" ? body.reason : "";

  try {
    if (action === "confirm") {
      await confirmStudentPayment({ paymentId: id, reviewerId: user.id });
    } else if (action === "reject") {
      await rejectStudentPayment({ paymentId: id, reviewerId: user.id, reason });
    } else {
      return NextResponse.json({ error: "Amal noto'g'ri" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof StudentPaymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError(error, { path: "/api/student-payments/[id]", userId: user.id });
    throw error;
  }
}
