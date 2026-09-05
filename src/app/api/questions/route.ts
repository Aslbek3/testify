import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageQuestionBank } from "@/lib/permissions";
import { createQuestion, QuestionBankError } from "@/services/questions";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !canManageQuestionBank(user)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const topicId = typeof body?.topicId === "string" ? body.topicId : "";
  const text = typeof body?.text === "string" ? body.text : "";
  const options = Array.isArray(body?.options)
    ? body.options.filter((option: unknown): option is string => typeof option === "string")
    : [];
  const correctOptionIndex =
    typeof body?.correctOptionIndex === "number" ? body.correctOptionIndex : -1;

  if (!topicId || !text || options.length === 0) {
    return NextResponse.json(
      { error: "Mavzu, savol matni va variantlar to'ldirilishi shart" },
      { status: 400 }
    );
  }

  try {
    const question = await createQuestion({
      topicId,
      text,
      options,
      correctOptionIndex,
    });
    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    if (error instanceof QuestionBankError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
