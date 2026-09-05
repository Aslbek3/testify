import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isDirector } from "@/lib/permissions";
import { createTutor } from "@/services/users";
import { RegistrationError } from "@/services/auth";

export async function POST(request: Request) {
  const user = await getSessionUser();
  // Direktor faqat o'z tashkilotiga ustoz qo'sha oladi — organizationId hech
  // qachon so'rov tanasidan olinmaydi, doim sessiyadan.
  if (!user || !isDirector(user) || !user.organizationId) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Ism, email va parol kiritilishi shart" },
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
    const tutor = await createTutor({
      name,
      email,
      password,
      organizationId: user.organizationId,
    });
    return NextResponse.json({ id: tutor.id, email: tutor.email }, { status: 201 });
  } catch (error) {
    if (error instanceof RegistrationError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
