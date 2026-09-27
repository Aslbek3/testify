import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canManageStudent } from "@/lib/permissions";
import { getStudentGroupContext } from "@/services/tutorDashboard";
import { setUserActive } from "@/services/users";
import { readBoolean, readJsonBody } from "@/lib/requestBody";

/**
 * O'quvchi hisobini bloklash/tiklash — direktor, qabulxona va (kalit
 * yoqilgan bo'lsa) o'z guruhi ustozi uchun.
 *
 * GET bu yerda ATAYLAB yo'q: o'quvchi tafsiloti jadval ichida AJAX
 * bilan emas, alohida sahifada (`/tutor/oquvchi/[id]`) serverdan
 * olinadi.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getVerifiedSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  const { id: studentId } = await params;
  const body = await readJsonBody(request);
  if (readBoolean(body, "isActive") === null) {
    return NextResponse.json({ error: "isActive kerak" }, { status: 400 });
  }

  const context = await getStudentGroupContext(studentId);
  // Topilmadi va ruxsat yo'q — bir xil 404.
  if (!context || !canManageStudent(user, context.group)) {
    return NextResponse.json({ error: "O'quvchi topilmadi" }, { status: 404 });
  }

  // Yuqorida `readBoolean(...) === null` bilan tekshirilgan, shuning
  // uchun bu yerda qiymat aniq boolean.
  await setUserActive(studentId, readBoolean(body, "isActive")!);
  return NextResponse.json({ ok: true });
}
