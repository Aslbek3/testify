import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canManageOrganizationSettings } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { updateOrganizationSwitches } from "@/services/organizationSettings";

/**
 * Rol kalitlari (`docs/rollar.md`) — FAQAT direktor, o'z tashkiloti
 * uchun. Tashkilot sessiyadan olinadi, so'rov tanasidan emas.
 *
 * To'lov sozlamalaridan (`/api/director/payment-settings`) alohida:
 * bu ikkisi boshqa narsalar — u yerda "narx qancha", bu yerda "kim
 * ishlatadi". Bittaga qo'shilsa, kalitni o'zgartirish uchun karta
 * raqami ham qayta yuborilishi kerak bo'lardi.
 */
export async function PUT(request: Request) {
  const user = await getVerifiedSessionUser();
  if (
    !user?.organizationId ||
    !canManageOrganizationSettings(user, user.organizationId)
  ) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "So'rov noto'g'ri" }, { status: 400 });
  }

  try {
    await updateOrganizationSwitches(user.organizationId, {
      // `=== true` ataylab: yuborilmagan kalit "o'chiq" deb tushuniladi,
      // forma esa har doim to'rttasini ham yuboradi. Shunda yarim
      // to'ldirilgan so'rov kalitni jimgina yoqib qo'ymaydi.
      receptionHandlesPayments: body.receptionHandlesPayments === true,
      receptionSeesProgress: body.receptionSeesProgress === true,
      tutorManagesStudents: body.tutorManagesStudents === true,
      tutorResetsPasswords: body.tutorResetsPasswords === true,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError(error, { path: "/api/director/role-settings", userId: user.id });
    throw error;
  }
}
