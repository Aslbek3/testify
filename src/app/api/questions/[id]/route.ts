import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canManageQuestionBank } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import {
  deleteQuestion,
  updateQuestion,
  QuestionBankError,
} from "@/services/questions";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getVerifiedSessionUser();
  if (!user || !canManageQuestionBank(user)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text : "";
  const options = Array.isArray(body?.options)
    ? body.options.filter((option: unknown): option is string => typeof option === "string")
    : [];
  const correctOptionIndex =
    typeof body?.correctOptionIndex === "number" ? body.correctOptionIndex : -1;
  const imageAlt = typeof body?.imageAlt === "string" ? body.imageAlt : null;

  if (!text || options.length === 0) {
    return NextResponse.json(
      { error: "Savol matni va variantlar to'ldirilishi shart" },
      { status: 400 }
    );
  }

  try {
    const question = await updateQuestion(id, { text, options, correctOptionIndex, imageAlt });
    return NextResponse.json(question);
  } catch (error) {
    if (error instanceof QuestionBankError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    logError(error, { path: "/api/questions/[id]", userId: user.id });
    throw error;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getVerifiedSessionUser();
  if (!user || !canManageQuestionBank(user)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await deleteQuestion(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof QuestionBankError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    logError(error, { path: "/api/questions/[id]", userId: user.id });
    throw error;
  }
}
