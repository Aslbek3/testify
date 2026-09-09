import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canManageOrganizations } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import {
  createOrganization,
  parsePlan,
  parseOrganizationStatus,
} from "@/services/organizations";

export async function POST(request: Request) {
  const user = await getVerifiedSessionUser();
  if (!user || !canManageOrganizations(user)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const city = typeof body?.city === "string" ? body.city.trim() : "";
  // Enum tekshiruvi service qatlamiga ko'chirildi (`parsePlan` /
  // `parseOrganizationStatus`) — PATCH route ham aynan shu ro'yxatlarga
  // muhtoj edi va nusxa ko'chirilsa ikkisi vaqt o'tib ajralib ketardi.
  const plan = parsePlan(body?.plan);
  const status = parseOrganizationStatus(body?.status) ?? undefined;

  if (!name || !city || !plan) {
    return NextResponse.json(
      { error: "Nomi, shahar va tarif tanlanishi shart" },
      { status: 400 }
    );
  }

  try {
    const organization = await createOrganization({ name, city, plan, status });
    return NextResponse.json(organization, { status: 201 });
  } catch (error) {
    logError(error, { path: "/api/organizations", userId: user.id });
    throw error;
  }
}
