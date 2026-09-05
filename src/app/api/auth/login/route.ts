import { NextResponse } from "next/server";
import { verifyCredentials } from "@/services/auth";
import { setSessionCookie } from "@/lib/auth";

// Ochiq endpoint — hali sessiyasi yo'q foydalanuvchi murojaat qiladi,
// shuning uchun permissions.ts orqali tekshiruv talab qilinmaydi.
export async function POST(request: Request) {
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
