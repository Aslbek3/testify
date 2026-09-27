import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { isStudent } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { startAttempt, AttemptError } from "@/services/attempts";
import { getStudentGroupId } from "@/services/studentDashboard";
import type { AttemptMode } from "@prisma/client";
import {
  readEnum,
  readInt,
  readJsonBody,
  readStringArray,
} from "@/lib/requestBody";

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

  const body = await readJsonBody(request);
  const mode = readEnum(body, "mode", VALID_MODES);
  // `readStringArray` bitta element noto'g'ri bo'lsa BUTUN maydonni rad
  // etadi — ilgari bu yerda noto'g'ri elementlar jimgina tashlab
  // yuborilardi va o'quvchi kutganidan kam mavzu bo'yicha test olardi.
  const topicIds = readStringArray(body, "topicIds") ?? undefined;

  if (!mode) {
    return NextResponse.json({ error: "Rejim (mode) noto'g'ri" }, { status: 400 });
  }
  // Maraton uchun — savollar soni. Chegaralar `startAttempt` ichida
  // tekshiriladi (u yagona manba), bu yerda faqat turi tekshiriladi.
  const questionCount =
    (readInt(body, "questionCount") ?? undefined);

  if (topicIds && topicIds.length > MAX_TOPIC_IDS) {
    return NextResponse.json(
      { error: `Mavzular soni ${MAX_TOPIC_IDS} tadan oshmasligi kerak` },
      { status: 400 }
    );
  }

  // Guruh klientdan emas — o'quvchining haqiqiy guruhidan serverda olinadi.
  const groupId = await getStudentGroupId(user.id);

  try {
    const result = await startAttempt({
      user,
      mode,
      topicIds,
      groupId,
      questionCount,
      source:
        mode === "EXAM" ? "EXAM" : questionCount !== undefined ? "MARATHON" : "PRACTICE",
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof AttemptError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError(error, { path: "/api/attempts", userId: user.id });
    throw error;
  }
}
