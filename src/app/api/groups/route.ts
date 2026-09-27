import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { isDirector } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { createGroup, DirectorActionError } from "@/services/directorDashboard";
import { readJsonBody, readRawString, readString } from "@/lib/requestBody";

export async function POST(request: Request) {
  const user = await getVerifiedSessionUser();
  if (!user || !isDirector(user) || !user.organizationId) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const body = await readJsonBody(request);
  const name = readString(body, "name");
  const tutorId = readRawString(body, "tutorId");

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
    logError(error, { path: "/api/groups", userId: user.id });
    throw error;
  }
}
