import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canManageGroup } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import {
  deleteGroup,
  getGroupDetail,
  updateGroup,
  DirectorActionError,
} from "@/services/directorDashboard";
import type { SessionUser } from "@/types/auth";

/**
 * Ikkala metod uchun umumiy darvoza: sessiya + `canManageGroup`.
 *
 * Guruh topilmagani ham, ruxsat yo'qligi ham AYNI 404 bilan qaytadi —
 * aks holda direktor boshqa tashkilotdagi ID'ni sinab ko'rib, javob
 * 403mi (guruh bor) yoki 404mi (guruh yo'q) degan farqdan o'sha
 * tashkilotda qaysi guruhlar borligini aniqlay olardi. Ayni naqsh
 * `/api/director/students/[id]/group` da ham ishlatilgan.
 */
async function authorize(
  groupId: string
): Promise<
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse }
> {
  const user = await getVerifiedSessionUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 }),
    };
  }

  const group = await getGroupDetail(groupId);
  if (!group || !canManageGroup(user, group)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Guruh topilmadi" }, { status: 404 }),
    };
  }

  return { ok: true, user };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params;
  const auth = await authorize(groupId);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  // Ikkala maydon ham ixtiyoriy — faqat nomni yoki faqat ustozni
  // o'zgartirish mumkin. Lekin hech biri bo'lmasa, so'rovning ma'nosi yo'q.
  const name = typeof body?.name === "string" ? body.name : undefined;
  const tutorId = typeof body?.tutorId === "string" ? body.tutorId : undefined;

  if (name === undefined && tutorId === undefined) {
    return NextResponse.json(
      { error: "Guruh nomi yoki ustoz ko'rsatilishi kerak" },
      { status: 400 }
    );
  }

  try {
    const group = await updateGroup(groupId, { name, tutorId });
    return NextResponse.json(group);
  } catch (error) {
    if (error instanceof DirectorActionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    logError(error, { path: "/api/groups/[id]", userId: auth.user.id });
    throw error;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params;
  const auth = await authorize(groupId);
  if (!auth.ok) return auth.response;

  try {
    await deleteGroup(groupId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Bo'sh bo'lmagan guruh (o'quvchisi yoki urinish tarixi bor) —
    // bu kutilgan holat, 500 emas: sabab foydalanuvchiga o'qiladigan
    // matn bilan qaytadi.
    if (error instanceof DirectorActionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    logError(error, { path: "/api/groups/[id]", userId: auth.user.id });
    throw error;
  }
}
