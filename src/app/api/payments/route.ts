import { NextResponse } from "next/server";
import type { Plan } from "@prisma/client";
import { getVerifiedSessionUser } from "@/lib/auth";
import { isDirector } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { submitPayment, PaymentError } from "@/services/payments";

const PLANS: Plan[] = ["START", "STANDARD", "PRO"];

/**
 * Direktor to'lov haqida xabar beradi.
 *
 * Ruxsat: FAQAT direktor va faqat O'Z tashkiloti uchun. `organizationId`
 * tanadan o'qilmaydi — sessiyadan olinadi, aks holda direktor boshqa
 * tashkilotning obunasini uzaytirib yuborishi mumkin bo'lardi.
 */
export async function POST(request: Request) {
  const user = await getVerifiedSessionUser();
  if (!user || !isDirector(user) || !user.organizationId) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const amount = typeof body?.amount === "number" ? body.amount : NaN;
  const months = typeof body?.months === "number" ? body.months : NaN;
  const plan = PLANS.includes(body?.plan) ? (body.plan as Plan) : null;

  if (!plan) {
    return NextResponse.json({ error: "Tarif rejasi noto'g'ri" }, { status: 400 });
  }

  try {
    await submitPayment({
      organizationId: user.organizationId,
      submittedById: user.id,
      amount,
      months,
      plan,
      reference: typeof body?.reference === "string" ? body.reference : null,
      note: typeof body?.note === "string" ? body.note : null,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError(error, { path: "/api/payments", userId: user.id });
    throw error;
  }
}
