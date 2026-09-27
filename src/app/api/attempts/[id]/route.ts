import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { saveAnswer, AttemptError } from "@/services/attempts";
import { readInt, readJsonBody, readRawString } from "@/lib/requestBody";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getVerifiedSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const { id } = await params;
  const body = await readJsonBody(request);
  const questionId = readRawString(body, "questionId");
  const selectedOptionIndex =
    (readInt(body, "selectedOptionIndex") ?? -1);

  if (!questionId || selectedOptionIndex < 0) {
    return NextResponse.json(
      { error: "questionId va selectedOptionIndex kerak" },
      { status: 400 }
    );
  }

  try {
    // canTakeAttempt tekshiruvi saveAnswer ICHIDA bajariladi — bu yerda
    // urinishni oldindan o'qib bo'lmaydi, chunki egalik shu orqaligina
    // aniqlanadi.
    const result = await saveAnswer({
      user,
      attemptId: id,
      questionId,
      selectedOptionIndex,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AttemptError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError(error, { path: "/api/attempts/[id]", userId: user.id });
    throw error;
  }
}
