import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canManageStudentPayments } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import {
  updateStudentPaymentSettings,
  StudentPaymentError,
} from "@/services/studentPayments";

function toPrice(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

/** Direktor o'quvchi to'lovi sozlamalarini saqlaydi. */
export async function PUT(request: Request) {
  const user = await getVerifiedSessionUser();
  // Tashkilot sessiyadan olinadi — direktor faqat o'z avtomaktabini sozlaydi.
  if (!user?.organizationId || !canManageStudentPayments(user, user.organizationId)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "So'rov noto'g'ri" }, { status: 400 });
  }

  try {
    await updateStudentPaymentSettings(user.organizationId, {
      enabled: body.enabled === true,
      cardNumber: typeof body.cardNumber === "string" ? body.cardNumber : "",
      cardHolder: typeof body.cardHolder === "string" ? body.cardHolder : "",
      priceOneMonth: toPrice(body.priceOneMonth),
      priceSixMonths: toPrice(body.priceSixMonths),
      trialDays: Number(body.trialDays),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof StudentPaymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError(error, { path: "/api/director/payment-settings", userId: user.id });
    throw error;
  }
}
