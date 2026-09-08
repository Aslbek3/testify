import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canManageTutor } from "@/lib/permissions";
import { validatePassword } from "@/lib/password";
import { logError } from "@/lib/logger";
import {
  PASSWORD_RESET_RATE_LIMIT,
  checkRateLimit,
  passwordResetRateLimitKey,
} from "@/lib/rateLimit";
import { getTutorOrgContext, resetUserPassword } from "@/services/users";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getVerifiedSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  // Cheklov kalit sifatida IP'ni emas, aynan parolni tiklayotgan xodimni
  // oladi: buzib olingan bitta direktor hisobi bilan barcha ustozlarning
  // parolini soniyalarda almashtirib yuborish mumkin edi (hammasi
  // sessionVersion oshgani uchun tizimdan chiqib ketardi). Byudjet va uning
  // asosi `lib/rateLimit.ts`dagi PASSWORD_RESET_RATE_LIMIT izohida.
  const rateLimit = checkRateLimit(
    passwordResetRateLimitKey(user.id),
    PASSWORD_RESET_RATE_LIMIT
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Juda ko'p parol tiklandi. Birozdan keyin qayta urinib ko'ring." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  const { id: tutorId } = await params;

  // Avval RUXSAT, keyin validatsiya: begona ustozning mavjud-mavjud emasligi
  // parol shakli haqidagi xabar orqali ham oshkor bo'lmasin.
  const tutor = await getTutorOrgContext(tutorId);
  if (!tutor) {
    return NextResponse.json({ error: "Ustoz topilmadi" }, { status: 404 });
  }
  if (!canManageTutor(user, tutor)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  try {
    await resetUserPassword(tutorId, password);
  } catch (error) {
    // Parol tiklash — hisobni egallab olishga olib keladigan amal, shuning
    // uchun muvaffaqiyatsizligi ham izsiz qolmasligi kerak.
    logError(error, {
      path: "/api/tutors/[id]/password",
      userId: user.id,
      targetUserId: tutorId,
    });
    throw error;
  }

  return NextResponse.json({ ok: true });
}
