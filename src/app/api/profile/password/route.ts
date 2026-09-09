import { NextResponse } from "next/server";
import { getVerifiedSessionUser, setSessionCookie } from "@/lib/auth";
import { validatePassword } from "@/lib/password";
import {
  PASSWORD_CHANGE_RATE_LIMIT,
  checkRateLimit,
  passwordChangeRateLimitKey,
} from "@/lib/rateLimit";
import { logError } from "@/lib/logger";
import { changeOwnPassword, ProfileError } from "@/services/profile";

/**
 * O'z parolini o'zgartirish.
 *
 * `permissions.ts` dan funksiya chaqirilmaydi va bu ataylab: bu yerda
 * "nishon" degan tushuncha yo'q — foydalanuvchi faqat O'ZINING parolini
 * o'zgartira oladi, chunki `userId` sessiyadan olinadi va tanadan hech
 * qachon o'qilmaydi. Ruxsat tekshiruvi = sessiya bor-yo'qligi
 * (login/logout route'laridagi kabi).
 */
export async function PATCH(request: Request) {
  const user = await getVerifiedSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  // Cheklov — bu endpoint joriy parolni tekshiradi, ya'ni u orqali parolni
  // taxmin qilishga urinish mumkin.
  const limit = checkRateLimit(
    passwordChangeRateLimitKey(user.id),
    PASSWORD_CHANGE_RATE_LIMIT
  );
  if (!limit.allowed) {
    const waitMinutes = Math.ceil(limit.retryAfterSeconds / 60);
    return NextResponse.json(
      {
        error: `Juda ko'p urinish qilindi. ${waitMinutes} daqiqadan keyin qayta urinib ko'ring.`,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const body = await request.json().catch(() => null);
  const currentPassword =
    typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Joriy va yangi parol kiritilishi shart" },
      { status: 400 }
    );
  }

  const invalid = validatePassword(newPassword);
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 });
  }

  try {
    const { sessionVersion } = await changeOwnPassword({
      userId: user.id,
      currentPassword,
      newPassword,
    });

    // Cookie yangi `sessionVersion` bilan qayta yoziladi. Usiz parolni
    // o'zgartirgan odamning o'zi ham darhol tizimdan chiqib ketardi:
    // `getVerifiedSessionUser` cookie'dagi eski versiyani bazadagi yangisi
    // bilan solishtiradi va mos kelmasa sessiyani bekor deb hisoblaydi.
    // Boshqa qurilmalardagi sessiyalar esa ATAYLAB o'ladi — parol
    // o'zgartirishning maqsadi ham shu.
    await setSessionCookie({ ...user, sessionVersion });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ProfileError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError(error, { path: "/api/profile/password", userId: user.id });
    throw error;
  }
}
