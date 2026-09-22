import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canManageLesson } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { getGroupDetail } from "@/services/directorDashboard";
import {
  LessonError,
  createLessonSeries,
  deleteUpcomingLessons,
} from "@/services/lessons";

/**
 * Guruhga dars jadvali tuzadi:
 * `{ groupId, weekdays: number[], hour, minute, durationMin, weeks,
 *    topicId?, note?, replaceUpcoming? }`
 *
 * Darslar bir yo'la yaratiladi — takrorlanish qoidasi saqlanmaydi
 * (`services/lessons.ts` izohiga qara). Chegaralar ham o'sha yerda.
 */
export async function POST(request: Request) {
  const user = await getVerifiedSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const groupId = typeof body?.groupId === "string" ? body.groupId : "";
  const weekdays: number[] = Array.isArray(body?.weekdays)
    ? body.weekdays.filter((d: unknown): d is number => typeof d === "number")
    : [];
  const hour = typeof body?.hour === "number" ? body.hour : NaN;
  const minute = typeof body?.minute === "number" ? body.minute : 0;
  const durationMin = typeof body?.durationMin === "number" ? body.durationMin : NaN;
  const weeks = typeof body?.weeks === "number" ? body.weeks : NaN;
  const topicId = typeof body?.topicId === "string" && body.topicId ? body.topicId : null;
  const note = typeof body?.note === "string" ? body.note.trim() : "";
  // Jadvalni qayta tuzishda eski kelajakdagi darslar o'chiriladi — aks
  // holda ikki nusxa chiqadi.
  const replaceUpcoming = body?.replaceUpcoming === true;

  if (!groupId || Number.isNaN(hour) || Number.isNaN(durationMin) || Number.isNaN(weeks)) {
    return NextResponse.json(
      { error: "Guruh, vaqt, davomiylik va hafta soni ko'rsatilishi shart" },
      { status: 400 }
    );
  }

  // Topilmadi va begona guruh — bir xil 404 (`/api/assignments` dagi kabi):
  // aks holda ID sinab ko'rib, boshqa tashkilotda qanday guruhlar borligini
  // aniqlash mumkin bo'lardi.
  const group = await getGroupDetail(groupId);
  if (!group || !canManageLesson(user, group)) {
    return NextResponse.json({ error: "Guruh topilmadi" }, { status: 404 });
  }

  try {
    const removed = replaceUpcoming ? await deleteUpcomingLessons(groupId) : null;
    const result = await createLessonSeries({
      groupId,
      createdById: user.id,
      weekdays,
      hour,
      minute,
      durationMin,
      weeks,
      topicId,
      note: note || null,
    });
    return NextResponse.json(
      { created: result.created, deleted: removed?.deleted ?? 0 },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof LessonError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError(error, { path: "/api/lessons", userId: user.id });
    return NextResponse.json({ error: "Xatolik yuz berdi" }, { status: 500 });
  }
}
