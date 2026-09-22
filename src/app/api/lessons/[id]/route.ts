import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canManageLesson } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { LessonError, deleteLesson, getLessonGroupRef } from "@/services/lessons";

/**
 * Bitta darsni o'chiradi — dars bekor qilinganda.
 *
 * Alohida dars o'chiriladi, butun jadval emas: aynan shuning uchun
 * takrorlanish qoidasi saqlanmaydi va har bir dars alohida yozuv
 * (`prisma/schema.prisma` dagi `Lesson` izohiga qara).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getVerifiedSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  const { id } = await params;

  // Topilmadi va begona dars — bir xil 404.
  const ref = await getLessonGroupRef(id);
  if (!ref || !canManageLesson(user, ref.group)) {
    return NextResponse.json({ error: "Dars topilmadi" }, { status: 404 });
  }

  try {
    await deleteLesson(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof LessonError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError(error, { path: `/api/lessons/${id}`, userId: user.id });
    return NextResponse.json({ error: "Xatolik yuz berdi" }, { status: 500 });
  }
}
