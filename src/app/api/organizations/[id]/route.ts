import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canManageOrganizations } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import {
  updateOrganization,
  parsePlan,
  parseOrganizationStatus,
  OrganizationError,
  OrganizationNotFoundError,
} from "@/services/organizations";

/**
 * Tashkilotni tahrirlash — FAQAT App Owner (`canManageOrganizations`).
 *
 * Qisman yangilash (partial update): faqat body'da kelgan maydonlar
 * o'zgaradi. Shuning uchun har bir maydon uchun "umuman berilmagan"
 * (`undefined`) va "noto'g'ri qiymat berilgan" holatlari farqlanadi —
 * noto'g'ri tarif/holat jimgina e'tiborsiz qoldirilsa, owner "Saqlash"
 * bosib, hech narsa o'zgarmaganini sezmay qolardi.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getVerifiedSessionUser();
  if (!user || !canManageOrganizations(user)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name : undefined;
  const city = typeof body.city === "string" ? body.city : undefined;

  const plan = body.plan === undefined ? undefined : parsePlan(body.plan);
  if (plan === null) {
    return NextResponse.json({ error: "Noto'g'ri tarif rejasi" }, { status: 400 });
  }

  const status =
    body.status === undefined ? undefined : parseOrganizationStatus(body.status);
  if (status === null) {
    return NextResponse.json({ error: "Noto'g'ri holat" }, { status: 400 });
  }

  try {
    const organization = await updateOrganization(id, { name, city, plan, status });
    return NextResponse.json(organization);
  } catch (error) {
    if (error instanceof OrganizationNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof OrganizationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    logError(error, { path: "/api/organizations/[id]", userId: user.id });
    throw error;
  }
}
