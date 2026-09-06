import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { finishAttempt, AttemptError } from "@/services/attempts";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const result = await finishAttempt({ user, attemptId: id });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AttemptError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError(error, { path: "/api/attempts/[id]/finish", userId: user.id });
    throw error;
  }
}
