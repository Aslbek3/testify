import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canManageStaff } from "@/lib/permissions";
import { getStaffOrgContext, setUserActive } from "@/services/users";
import { readBoolean, readJsonBody } from "@/lib/requestBody";

/** Xodimni (ustoz yoki qabulxona) bloklash/tiklash — faqat direktor. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getVerifiedSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  const { id: staffId } = await params;
  const body = await readJsonBody(request);
  if (readBoolean(body, "isActive") === null) {
    return NextResponse.json({ error: "isActive kerak" }, { status: 400 });
  }

  const staff = await getStaffOrgContext(staffId);
  // Topilmadi va ruxsat yo'q — bir xil 404.
  if (!staff || !canManageStaff(user, staff)) {
    return NextResponse.json({ error: "Xodim topilmadi" }, { status: 404 });
  }

  // Yuqorida `readBoolean(...) === null` bilan tekshirilgan, shuning
  // uchun bu yerda qiymat aniq boolean.
  await setUserActive(staffId, readBoolean(body, "isActive")!);
  return NextResponse.json({ ok: true });
}
