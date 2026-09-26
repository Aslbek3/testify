import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canManageQuestionBank } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import {
  createTopic,
  listTopicsWithQuestionCount,
  QuestionBankError,
} from "@/services/questions";

export async function GET() {
  const user = await getVerifiedSessionUser();
  if (!user || !canManageQuestionBank(user)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const topics = await listTopicsWithQuestionCount();
  return NextResponse.json(topics);
}

export async function POST(request: Request) {
  const user = await getVerifiedSessionUser();
  if (!user || !canManageQuestionBank(user)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const category = typeof body?.category === "string" ? body.category : null;

  if (!name) {
    return NextResponse.json(
      { error: "Mavzu nomi kiritilishi shart" },
      { status: 400 }
    );
  }

  try {
    const topic = await createTopic(name, category);
    return NextResponse.json(topic, { status: 201 });
  } catch (error) {
    if (error instanceof QuestionBankError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    logError(error, { path: "/api/topics", userId: user.id });
    throw error;
  }
}
