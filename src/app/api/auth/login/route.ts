import { NextResponse } from "next/server";
import { verifyCredentials } from "@/services/auth";
import { setSessionCookie } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

// Ochiq endpoint — hali sessiyasi yo'q foydalanuvchi murojaat qiladi,
// shuning uchun permissions.ts orqali tekshiruv talab qilinmaydi.
export async function POST(request: Request) {
  // Parolni "brute force" qilishning oldini olish uchun IP bo'yicha
  // urinishlar sonini cheklaymiz — bu bazaga murojaat qilishdan oldin
  // tekshiriladi.
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";

  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    const waitMinutes = Math.ceil(rateLimit.retryAfterSeconds / 60);
    return NextResponse.json(
      {
        error: `Juda ko'p urinish qilindi. Iltimos, ${waitMinutes} daqiqadan keyin qayta urinib ko'ring.`,
      },
      { status: 429 }
    );
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

  const user = await verifyCredentials(email, password);
  if (!user) {
    return NextResponse.json(
      { error: "Email yoki parol noto'g'ri" },
      { status: 401 }
    );
  }

  await setSessionCookie(user);
  return NextResponse.json({ role: user.role });
}
