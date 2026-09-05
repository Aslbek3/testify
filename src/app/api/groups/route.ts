import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isDirector } from "@/lib/permissions";
import { createGroup, DirectorActionError } from "@/services/directorDashboard";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !isDirector(user) || !user.organizationId) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const tutorId = typeof body?.tutorId === "string" ? body.tutorId : "";

  if (!name || !tutorId) {
    return NextResponse.json(
      { error: "Guruh nomi va ustoz tanlanishi shart" },
      { status: 400 }
    );
  }

  try {
    const group = await createGroup({
      name,
      tutorId,
      organizationId: user.organizationId,
    });
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    if (error instanceof DirectorActionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
