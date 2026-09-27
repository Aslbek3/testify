import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { updateOwnName, ProfileError } from "@/services/profile";
import { readJsonBody, readNullableString } from "@/lib/requestBody";

/**
 * O'z profilini yangilash (hozircha faqat ism).
 *
 * `permissions.ts` dan funksiya chaqirilmaydi va bu ataylab: bu yerda
 * "nishon" degan tushuncha yo'q — `userId` sessiyadan olinadi va tanadan
 * hech qachon o'qilmaydi, ya'ni foydalanuvchi faqat O'ZINIKINI o'zgartira
 * oladi. Ruxsat tekshiruvi = sessiya bor-yo'qligi (parol o'zgartirish
 * route'idagi kabi).
 */
export async function PATCH(request: Request) {
  const user = await getVerifiedSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  const body = await readJsonBody(request);
  // Kesilmagan qiymat: bo'shliqlarni `updateOwnName` o'zi oladi va u
  // yerda "faqat bo'shliqdan iborat ism" ham rad etiladi.
  const name = readNullableString(body, "name");
  if (name === null) {
    return NextResponse.json({ error: "Ism kiritilishi shart" }, { status: 400 });
  }

  try {
    await updateOwnName(user.id, name);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ProfileError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError(error, { path: "/api/profile", userId: user.id });
    throw error;
  }
}
