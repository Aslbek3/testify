import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canManageQuestionBank } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { importQuestions, QuestionImportError } from "@/services/questionImport";

/**
 * Savollarni ommaviy import qilish — FAQAT savollar bazasini boshqaradigan
 * rol (owner). Tana: `{ questions: [...] }`.
 *
 * Javob har doim HISOBOT qaytaradi: nechtasi yozildi, nechtasi takror
 * bo'lgani uchun o'tkazib yuborildi, qaysi mavzular yangi ochildi.
 * Xato bo'lsa — qator raqami bilan, va hech narsa yozilmagan bo'ladi.
 */
export async function POST(request: Request) {
  const user = await getVerifiedSessionUser();
  if (!user || !canManageQuestionBank(user)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "So'rov noto'g'ri" }, { status: 400 });
  }

  try {
    const result = await importQuestions(body.questions);
    // Xatolar bo'lsa 400: hech narsa yozilmagan, lekin hisobot to'liq
    // qaytadi — foydalanuvchi qaysi qatorni tuzatishni biladi.
    return NextResponse.json(result, { status: result.errors.length > 0 ? 400 : 200 });
  } catch (error) {
    if (error instanceof QuestionImportError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError(error, { path: "/api/questions/import", userId: user.id });
    throw error;
  }
}
