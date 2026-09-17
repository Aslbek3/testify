import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canCreateStudent } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { INVALID_EMAIL_MESSAGE, isValidEmail, normalizeEmail } from "@/lib/email";
import { validatePassword } from "@/lib/password";
import { registerStudent, RegistrationError } from "@/services/auth";
import { getGroupPermissionContext } from "@/services/users";

/**
 * O'quvchi qo'shish — direktor, qabulxona va (kalit yoqilgan bo'lsa)
 * ustoz uchun BITTA endpoint.
 *
 * Ilgari bu ikki joyda edi (`/api/director/students` va
 * `/api/tutor/students`): bir xil validatsiya, bir xil xato matnlari,
 * lekin guruh tekshiruvi har birida boshqacha yozilgan edi. Endi
 * "kim qaysi guruhga qo'sha oladi" degan savolga faqat
 * `canCreateStudent` javob beradi — yangi rol qo'shilganda yoki kalit
 * o'zgarganda tuzatiladigan joy bitta.
 */
export async function POST(request: Request) {
  const user = await getVerifiedSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const groupId = typeof body?.groupId === "string" ? body.groupId : "";

  if (!name || !email || !password || !groupId) {
    return NextResponse.json(
      { error: "Ism, email, parol va guruh tanlanishi shart" },
      { status: 400 }
    );
  }

  // Avval RUXSAT, keyin qolgan validatsiya: begona guruhning
  // mavjud-mavjud emasligi parol yoki email shakli haqidagi xabar
  // orqali ham oshkor bo'lmasin.
  const group = await getGroupPermissionContext(groupId);
  // Topilmadi va ruxsat yo'q — bir xil 404: guruh ID'sini taxmin qilib
  // boshqa tashkilotda qanday guruhlar borligini bilib bo'lmasin.
  if (!group || !canCreateStudent(user, group)) {
    return NextResponse.json({ error: "Guruh topilmadi" }, { status: 404 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: INVALID_EMAIL_MESSAGE }, { status: 400 });
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  try {
    const student = await registerStudent({ name, email, password, groupId });
    return NextResponse.json({ id: student.id }, { status: 201 });
  } catch (error) {
    if (error instanceof RegistrationError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    logError(error, { path: "/api/students", userId: user.id });
    throw error;
  }
}
