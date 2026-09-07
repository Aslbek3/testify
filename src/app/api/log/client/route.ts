import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import {
  CLIENT_LOG_RATE_LIMIT,
  checkRateLimit,
  clientLogRateLimitKey,
  getClientIp,
} from "@/lib/rateLimit";

/**
 * Client komponentlarda (masalan error.tsx) ushlangan xatolarni serverga
 * ko'chirib, PM2 log fayliga structured JSON qatori sifatida yozadi.
 * Kirish ma'lumoti ishonchsiz — qayta strukturalanadi, faqat kutilgan
 * maydonlar saqlanadi, xabar uzunligi cheklanadi.
 *
 * Ikki himoya qatlami bor:
 *  1. Sessiya majburiy — aks holda istalgan odam anonim ravishda logga
 *     yozib, diskni to'ldirishi mumkin edi (disk zaxira nusxalar bilan
 *     bo'lishiladi).
 *  2. IP bo'yicha rate limit — sessiyasi bor foydalanuvchi ham cheksiz
 *     yoza olmaydi.
 *
 * `userId` HAR DOIM tasdiqlangan sessiyadan olinadi, so'rov tanasidan emas —
 * aks holda xatoni kim qayd etganini soxtalashtirish va tergovni chalg'itish
 * mumkin bo'lar edi.
 *
 * Endpoint "fail-safe": xato haqidagi xabarning o'zi rad etilsa ham, uni
 * yuborgan sahifa buzilmasligi kerak — shuning uchun har doim oddiy JSON
 * javob qaytariladi, hech qachon istisno tashlanmaydi.
 */
export async function POST(request: Request) {
  const user = await getVerifiedSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  const rateLimit = checkRateLimit(
    clientLogRateLimitKey(getClientIp(request)),
    CLIENT_LOG_RATE_LIMIT
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Juda ko'p so'rov" },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const entry = {
    level: "error",
    time: new Date().toISOString(),
    source: "client",
    path: typeof data.path === "string" ? data.path.slice(0, 500) : null,
    userId: user.id,
    message: typeof data.message === "string" ? data.message.slice(0, 2000) : "unknown",
  };

  console.error(JSON.stringify(entry));
  return NextResponse.json({ ok: true });
}
