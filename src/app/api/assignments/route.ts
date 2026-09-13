import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canManageAssignment } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { getGroupDetail } from "@/services/directorDashboard";
import {
  AssignmentError,
  createAssignment,
  isAssignmentKind,
} from "@/services/assignments";

/**
 * Ustoz guruhga vazifa beradi:
 * `{ groupId, kind, topicIds, targetCount, dueDate: "yyyy-mm-dd", note }`.
 * Maydonlarning chegaralari `services/assignments.ts` da tekshiriladi.
 */
export async function POST(request: Request) {
  const user = await getVerifiedSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const groupId = typeof body?.groupId === "string" ? body.groupId : "";
  const kind = isAssignmentKind(body?.kind) ? body.kind : null;
  const topicIds: string[] = Array.isArray(body?.topicIds)
    ? body.topicIds.filter((t: unknown): t is string => typeof t === "string")
    : [];
  const targetCount = typeof body?.targetCount === "number" ? body.targetCount : NaN;
  const dueDate = typeof body?.dueDate === "string" ? body.dueDate : "";
  const note = typeof body?.note === "string" ? body.note : "";

  if (!groupId || !kind || !dueDate) {
    return NextResponse.json(
      { error: "Guruh, vazifa turi va muddat ko'rsatilishi shart" },
      { status: 400 }
    );
  }

  // Topilmadi va begona guruh — bir xil 404 (`/api/groups/[id]` dagi kabi).
  const group = await getGroupDetail(groupId);
  if (!group || !canManageAssignment(user, group)) {
    return NextResponse.json({ error: "Guruh topilmadi" }, { status: 404 });
  }

  try {
    const assignment = await createAssignment({
      groupId,
      createdById: user.id,
      kind,
      topicIds,
      targetCount,
      dueDate,
      note,
    });
    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    if (error instanceof AssignmentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError(error, { path: "/api/assignments", userId: user.id });
    throw error;
  }
}
