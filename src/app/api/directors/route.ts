import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageOrganizations } from "@/lib/permissions";
import { createDirector } from "@/services/users";
import { RegistrationError } from "@/services/auth";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !canManageOrganizations(user)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const organizationId =
    typeof body?.organizationId === "string" ? body.organizationId : "";

  if (!name || !email || !password || !organizationId) {
    return NextResponse.json(
      { error: "Ism, email, parol va tashkilot tanlanishi shart" },
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
    const director = await createDirector({ name, email, password, organizationId });
    return NextResponse.json({ id: director.id, email: director.email }, { status: 201 });
  } catch (error) {
    if (error instanceof RegistrationError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
