import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isStudent } from "@/lib/permissions";
import { startAttempt, AttemptError } from "@/services/attempts";
import { getStudentGroupId } from "@/services/studentDashboard";
import type { AttemptMode } from "@prisma/client";

const VALID_MODES: AttemptMode[] = ["PRACTICE", "EXAM"];

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !isStudent(user)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const mode: AttemptMode | null = VALID_MODES.includes(body?.mode) ? body.mode : null;
  const topicIds = Array.isArray(body?.topicIds)
    ? body.topicIds.filter((t: unknown): t is string => typeof t === "string")
    : undefined;

  if (!mode) {
    return NextResponse.json({ error: "Rejim (mode) noto'g'ri" }, { status: 400 });
  }

  // Guruh klientdan emas — o'quvchining haqiqiy guruhidan serverda olinadi.
  const groupId = await getStudentGroupId(user.id);

  try {
    const result = await startAttempt({ user, mode, topicIds, groupId });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof AttemptError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
