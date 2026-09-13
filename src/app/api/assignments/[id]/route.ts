import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canManageAssignment } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { deleteAssignment, getAssignmentGroupRef } from "@/services/assignments";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getVerifiedSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  const { id } = await params;
  // Topilmadi va begona vazifa — bir xil 404: aks holda ID'larni sinab,
  // boshqa guruhlarda qaysi vazifalar borligini aniqlash mumkin bo'lardi.
  const group = await getAssignmentGroupRef(id);
  if (!group || !canManageAssignment(user, group)) {
    return NextResponse.json({ error: "Vazifa topilmadi" }, { status: 404 });
  }

  try {
    await deleteAssignment(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError(error, { path: "/api/assignments/[id]", userId: user.id });
    throw error;
  }
}
