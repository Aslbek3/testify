import { NextResponse } from "next/server";
import { registerStudent, RegistrationError } from "@/services/auth";
import { setSessionCookie } from "@/lib/auth";

// Ochiq endpoint — faqat Student o'zi ro'yxatdan o'tadi (mahsulot qoidasi).
// Owner/Director/Tutor akkauntlari admin tomonidan yaratiladi.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : undefined;
  const groupId = typeof body?.groupId === "string" ? body.groupId : "";

  if (!name || !email || !password || !groupId) {
    return NextResponse.json(
      { error: "Ism, email, parol va guruh tanlash shart" },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Parol kamida 8 belgidan iborat bo'lishi kerak" },
      { status: 400 }
    );
  }

  try {
    const user = await registerStudent({ name, email, password, phone, groupId });
    await setSessionCookie(user);
    return NextResponse.json({ role: user.role }, { status: 201 });
  } catch (error) {
    if (error instanceof RegistrationError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
