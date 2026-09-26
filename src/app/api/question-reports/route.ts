import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canReportQuestion } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import {
  reportQuestion,
  QuestionReportError,
  REPORT_REASON_MAX_LENGTH,
} from "@/services/questionReports";

/** Savolga shikoyat yuborish — o'quvchi va ustoz. */
export async function POST(request: Request) {
  const user = await getVerifiedSessionUser();
  if (!user || !canReportQuestion(user)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const questionId = typeof body?.questionId === "string" ? body.questionId : "";
  const reason = typeof body?.reason === "string" ? body.reason : null;

  if (!questionId) {
    return NextResponse.json({ error: "questionId kerak" }, { status: 400 });
  }
  if (reason !== null && reason.length > REPORT_REASON_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Izoh ${REPORT_REASON_MAX_LENGTH} belgidan oshmasligi kerak` },
      { status: 400 }
    );
  }

  try {
    await reportQuestion({ questionId, reportedById: user.id, reason });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof QuestionReportError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError(error, { path: "/api/question-reports", userId: user.id });
    throw error;
  }
}
