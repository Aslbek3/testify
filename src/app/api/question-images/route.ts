import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canManageQuestionBank } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { MAX_QUESTION_IMAGE_BYTES, QUESTION_IMAGE_URL_PREFIX } from "@/lib/questionImages";
import { saveQuestionImage } from "@/lib/questionImageStorage";

/**
 * Savol rasmini yuklash — FAQAT savollar bazasini boshqaradigan rol
 * (owner). Javobda tayyor manzil qaytadi, forma uni `imageUrl` sifatida
 * savol bilan birga saqlaydi.
 *
 * Rasm savolga BOG'LANMAGAN holda saqlanadi: forma to'ldirilayotganda
 * savol hali yo'q. Saqlanmay qolgan rasm diskda yetim qoladi — bu
 * ataylab: uni o'chirish uchun "qaysi rasm qaysi savolga tegishli"
 * hisobini yuritish kerak bo'lardi, foyda esa bir necha kilobayt.
 */
export async function POST(request: Request) {
  const user = await getVerifiedSessionUser();
  if (!user || !canManageQuestionBank(user)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Rasm fayli yuborilmadi" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Fayl bo'sh" }, { status: 400 });
  }
  if (file.size > MAX_QUESTION_IMAGE_BYTES) {
    return NextResponse.json(
      { error: `Rasm hajmi ${Math.round(MAX_QUESTION_IMAGE_BYTES / (1024 * 1024))} MB dan oshmasligi kerak` },
      { status: 413 }
    );
  }

  try {
    const saved = await saveQuestionImage(new Uint8Array(await file.arrayBuffer()));
    if (!saved) {
      return NextResponse.json(
        { error: "Rasm faqat JPG, PNG yoki WEBP bo'lishi mumkin" },
        { status: 400 }
      );
    }
    return NextResponse.json({ url: `${QUESTION_IMAGE_URL_PREFIX}${saved.key}` }, { status: 201 });
  } catch (error) {
    logError(error, { path: "/api/question-images", userId: user.id });
    throw error;
  }
}
