import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canManageQuestionBank } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { createQuestion, QuestionBankError } from "@/services/questions";
import {
  readInt,
  readJsonBody,
  readNullableString,
  readRawString,
} from "@/lib/requestBody";

export async function POST(request: Request) {
  const user = await getVerifiedSessionUser();
  if (!user || !canManageQuestionBank(user)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const body = await readJsonBody(request);
  const topicId = readRawString(body, "topicId");
  const text = readRawString(body, "text");
  const options = Array.isArray(body?.options)
    ? body.options.filter((option: unknown): option is string => typeof option === "string")
    : [];
  const correctOptionIndex =
    (readInt(body, "correctOptionIndex") ?? -1);
  const imageUrl = readNullableString(body, "imageUrl");
  const imageAlt = readNullableString(body, "imageAlt");
  const explanation =
    readNullableString(body, "explanation");
  const legalReference =
    readNullableString(body, "legalReference");

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
      imageUrl,
    imageAlt,
      explanation,
      legalReference,
    });
    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    if (error instanceof QuestionBankError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    logError(error, { path: "/api/questions", userId: user.id });
    throw error;
  }
}
