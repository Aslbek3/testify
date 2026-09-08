import { NextResponse } from "next/server";
import { verifyCredentials, OrganizationExpiredError } from "@/services/auth";
import { setSessionCookie } from "@/lib/auth";
import { normalizeEmail } from "@/lib/email";
import {
  LOGIN_ACCOUNT_RATE_LIMIT,
  LOGIN_IP_RATE_LIMIT,
  checkRateLimit,
  getClientIp,
  loginAccountRateLimitKey,
  loginIpRateLimitKey,
  resetRateLimit,
} from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

function tooManyAttempts(retryAfterSeconds: number) {
  const waitMinutes = Math.ceil(retryAfterSeconds / 60);
  return NextResponse.json(
    {
      error: `Juda ko'p urinish qilindi. Iltimos, ${waitMinutes} daqiqadan keyin qayta urinib ko'ring.`,
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

// Ochiq endpoint — hali sessiyasi yo'q foydalanuvchi murojaat qiladi,
// shuning uchun permissions.ts orqali tekshiruv talab qilinmaydi.
export async function POST(request: Request) {
  // Parolni "brute force" qilishning oldini olish uchun IKKI hisoblagich
  // ishlatiladi (faqat IP bo'yicha cheklov ikki tomonlama noto'g'ri edi):
  //  - faqat IP: hujumchi yuzlab proxy orqali bitta hisobga cheksiz urina
  //    olardi, ayni paytda bitta NAT ortidagi 30 kishilik sinf esa
  //    bir-birini bloklab qo'yardi;
  //  - shuning uchun IP bo'yicha bo'shroq (mavjudlik uchun), hisob bo'yicha
  //    qattiqroq (xavfsizlik uchun) cheklov qo'yiladi.
  // Ikkalasining raqamlari va asosi `lib/rateLimit.ts`da izohlangan.
  const ip = getClientIp(request);
  const ipKey = loginIpRateLimitKey(ip);

  // IP bo'yicha tekshiruv bazaga va JSON parse'ga qadar — eng arzoni birinchi.
  const ipRateLimit = checkRateLimit(ipKey, LOGIN_IP_RATE_LIMIT);
  if (!ipRateLimit.allowed) {
    return tooManyAttempts(ipRateLimit.retryAfterSeconds);
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email va parol kiritilishi shart" },
      { status: 400 }
    );
  }

  // Kalit normallashtirilgan email bo'yicha — aks holda `Ali@x.com` va
  // `ali@x.com` bitta hisob uchun ikkita alohida byudjet berar edi.
  const accountKey = loginAccountRateLimitKey(normalizeEmail(email));
  const accountRateLimit = checkRateLimit(accountKey, LOGIN_ACCOUNT_RATE_LIMIT);
  if (!accountRateLimit.allowed) {
    return tooManyAttempts(accountRateLimit.retryAfterSeconds);
  }

  try {
    let user;
    try {
      user = await verifyCredentials(email, password);
    } catch (error) {
      if (error instanceof OrganizationExpiredError) {
        // Parol to'g'ri edi — bu halol foydalanuvchi, hisoblagichlari
        // bo'shatiladi (aks holda tarif uzaytirilgach ham 15 daqiqa
        // kutishga majbur bo'lardi).
        resetRateLimit(ipKey);
        resetRateLimit(accountKey);
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      throw error;
    }

    if (!user) {
      return NextResponse.json(
        { error: "Email yoki parol noto'g'ri" },
        { status: 401 }
      );
    }

    // MUVAFFAQIYATLI login — ikkala hisoblagich ham tozalanadi. Bu shunchaki
    // "yaxshi xulq" emas, mavjudlik uchun ZARUR: bitta NAT ortidagi sinf
    // a'zolari muvaffaqiyatli kirishlari bilan umumiy IP byudjetini yeb
    // qo'ymasligi kerak. Tozalashdan keyin hisoblagichda faqat
    // muvaffaqiyatsiz urinishlar qoladi.
    resetRateLimit(ipKey);
    resetRateLimit(accountKey);

    await setSessionCookie(user);
    return NextResponse.json({ role: user.role });
  } catch (error) {
    // userId yo'q — sessiya hali yaratilmagan, foydalanuvchi hali tanilmagan.
    logError(error, { path: "/api/auth/login" });
    throw error;
  }
}
