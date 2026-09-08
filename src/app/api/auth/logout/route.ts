import { NextResponse } from "next/server";
import { clearSessionCookie, getVerifiedSessionUser } from "@/lib/auth";
import { revokeUserSessions } from "@/services/auth";
import { logError } from "@/lib/logger";

// Ochiq endpoint — o'z sessiyasini tugatish har doim ruxsat etiladi,
// shuning uchun permissions.ts orqali tekshiruv talab qilinmaydi (login
// route'idagi kabi).
export async function POST() {
  // Cookie'ni o'chirish uchun foydalanuvchini aniqlash SHART EMAS — u
  // shartsiz o'chiriladi, ya'ni allaqachon bekor qilingan sessiya egasi ham
  // bemalol chiqib keta oladi.
  await clearSessionCookie();

  // Sessiyani BEKOR QILISH esa faqat haqiqiy, amaldagi sessiya uchun.
  // Bu yerda ataylab `getVerifiedSessionUser` (imzo + baza holati), chunki
  // `getSessionUser` faqat imzoni tekshiradi: bir marta o'g'irlangan, keyin
  // allaqachon bekor qilingan token ham imzo jihatdan yaroqli bo'lib
  // qolaveradi. Undan foydalanib logout'ni qayta-qayta chaqirish
  // `sessionVersion`ni oshiraverib, egasini har safar tizimdan chiqarib
  // yuborardi — ya'ni foydasiz token doimiy buzg'unchilik vositasiga
  // aylanardi.
  const user = await getVerifiedSessionUser();

  if (user) {
    // Cookie'ni o'chirishning o'zi yetarli emas edi — chiqarilgan JWT yana
    // bir hafta amal qilardi. Umumiy kompyuterdan chiqqan foydalanuvchining
    // cookie'si nusxalab olingan bo'lsa, hujumchi shu muddat davomida uning
    // nomidan ishlay olardi (direktor/ustoz hisobida — parol tiklash
    // huquqi bilan). sessionVersion oshirilishi o'sha tokenni darhol
    // yaroqsiz qiladi.
    try {
      await revokeUserSessions(user.id);
    } catch (error) {
      // Chiqish jarayoni baza xatosi tufayli buzilmasligi kerak — cookie
      // allaqachon o'chirilgan. Lekin iz qolishi shart.
      logError(error, { path: "/api/auth/logout", userId: user.id });
    }
  }

  return NextResponse.json({ ok: true });
}
