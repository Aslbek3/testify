import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { isStudent } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { startAttempt, AttemptError } from "@/services/attempts";
import { getStudentGroupId } from "@/services/studentDashboard";
import type { AttemptMode } from "@prisma/client";

const VALID_MODES: AttemptMode[] = ["PRACTICE", "EXAM"];

// topicIds to'g'ridan-to'g'ri Prisma `{ topicId: { in: [...] } }` ichiga
// tushadi — cheklovsiz massiv bazaga juda katta so'rov yasab yuborishi
// mumkin. Haqiqiy mavzular soni bundan ancha kam.
const MAX_TOPIC_IDS = 50;

export async function POST(request: Request) {
  const user = await getVerifiedSessionUser();
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
  // Maraton uchun — savollar soni. Chegaralar `startAttempt` ichida
  // tekshiriladi (u yagona manba), bu yerda faqat turi tekshiriladi.
  const questionCount =
    typeof body?.questionCount === "number" ? body.questionCount : undefined;

  if (topicIds && topicIds.length > MAX_TOPIC_IDS) {
    return NextResponse.json(
      { error: `Mavzular soni ${MAX_TOPIC_IDS} tadan oshmasligi kerak` },
      { status: 400 }
    );
  }

  // Guruh klientdan emas — o'quvchining haqiqiy guruhidan serverda olinadi.
  const groupId = await getStudentGroupId(user.id);

  try {
    const result = await startAttempt({ user, mode, topicIds, groupId, questionCount });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof AttemptError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError(error, { path: "/api/attempts", userId: user.id });
    throw error;
  }
}
