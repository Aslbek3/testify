import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageOrganizations } from "@/lib/permissions";
import { createOrganization } from "@/services/organizations";
import type { Plan, OrganizationStatus } from "@prisma/client";

const VALID_PLANS: Plan[] = ["START", "STANDARD", "PRO"];
const VALID_STATUSES: OrganizationStatus[] = ["ACTIVE", "TRIAL", "EXPIRED"];

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !canManageOrganizations(user)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const city = typeof body?.city === "string" ? body.city.trim() : "";
  const plan = VALID_PLANS.includes(body?.plan) ? (body.plan as Plan) : null;
  const status = VALID_STATUSES.includes(body?.status)
    ? (body.status as OrganizationStatus)
    : undefined;

  if (!name || !city || !plan) {
    return NextResponse.json(
      { error: "Nomi, shahar va tarif tanlanishi shart" },
      { status: 400 }
    );
  }

  const organization = await createOrganization({ name, city, plan, status });
  return NextResponse.json(organization, { status: 201 });
}
