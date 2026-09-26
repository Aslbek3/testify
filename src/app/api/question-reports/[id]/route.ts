import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canReviewQuestionReports } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { resolveReport, QuestionReportError } from "@/services/questionReports";

/** Shikoyatni yopish — faqat owner (savollar bazasi umumiy). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getVerifiedSessionUser();
  if (!user || !canReviewQuestionReports(user)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status = body?.status;

  if (status !== "RESOLVED" && status !== "DISMISSED") {
    return NextResponse.json(
      { error: "status RESOLVED yoki DISMISSED bo'lishi kerak" },
      { status: 400 }
    );
  }

  try {
    await resolveReport({ reportId: id, status });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof QuestionReportError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError(error, { path: "/api/question-reports/[id]", userId: user.id });
    throw error;
  }
}
