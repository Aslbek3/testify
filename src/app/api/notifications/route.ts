import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { markAllNotificationsRead } from "@/services/notifications";

/**
 * O'z bildirishnomalarini o'qilgan deb belgilash.
 *
 * `permissions.ts` dan funksiya chaqirilmaydi va bu ataylab
 * (`/api/profile/password` dagi kabi): "nishon" tushunchasi yo'q —
 * `userId` faqat sessiyadan olinadi, tanadan hech narsa o'qilmaydi, ya'ni
 * boshqa birovning bildirishnomasiga tegib bo'lmaydi. Ruxsat tekshiruvi =
 * sessiya bor-yo'qligi.
 */
export async function PATCH() {
  const user = await getVerifiedSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  try {
    const marked = await markAllNotificationsRead(user.id);
    return NextResponse.json({ marked });
  } catch (error) {
    logError(error, { path: "/api/notifications", userId: user.id });
    throw error;
  }
}
