import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canManageOrganizations } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { confirmPayment, rejectPayment, PaymentError } from "@/services/payments";

/**
 * Owner to'lovni tasdiqlaydi yoki rad etadi.
 *
 * Ruxsat: FAQAT owner. Direktor o'z tashkilotining to'lovini tasdiqlay
 * olmasligi kerak — aks holda u obunani o'zi cheksiz uzaytirardi.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getVerifiedSessionUser();
  if (!user || !canManageOrganizations(user)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const action = body?.action;

  try {
    if (action === "confirm") {
      await confirmPayment({ paymentId: id, reviewedById: user.id });
    } else if (action === "reject") {
      await rejectPayment({
        paymentId: id,
        reviewedById: user.id,
        reason: typeof body?.reason === "string" ? body.reason : "",
      });
    } else {
      return NextResponse.json(
        { error: "Amal noto'g'ri (confirm yoki reject)" },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError(error, { path: "/api/payments/[id]", userId: user.id });
    throw error;
  }
}
