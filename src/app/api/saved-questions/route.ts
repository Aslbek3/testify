import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canSaveQuestion } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { toggleSavedQuestion, SavedQuestionError } from "@/services/savedQuestions";

/**
 * Savolni saqlash / saqlanganini bekor qilish.
 *
 * Bitta POST ikkala amalni bajaradi, chunki ekranda ham bitta tugma:
 * holat javobda qaytadi (`saved`). Alohida DELETE bo'lsa, klient
 * tomonda hozirgi holatni bilish kerak bo'lardi.
 */
export async function POST(request: Request) {
  const user = await getVerifiedSessionUser();
  if (!user || !canSaveQuestion(user)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const questionId = typeof body?.questionId === "string" ? body.questionId : "";
  if (!questionId) {
    return NextResponse.json({ error: "questionId kerak" }, { status: 400 });
  }

  try {
    const result = await toggleSavedQuestion({ studentId: user.id, questionId });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SavedQuestionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError(error, { path: "/api/saved-questions", userId: user.id });
    throw error;
  }
}
