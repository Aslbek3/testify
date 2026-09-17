import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { readQuestionImage } from "@/lib/questionImageStorage";

/**
 * Savol rasmini berish.
 *
 * `permissions.ts` dan funksiya chaqirilmaydi va bu ataylab: rasm
 * savolning bir qismi, savolni esa HAR BIR rol ko'radi (o'quvchi testda,
 * ustoz tahlilda, owner tahrirlashda). Ya'ni bu yerda "nishon" degan
 * tushuncha yo'q — tekshiruv sessiya bor-yo'qligi (`/api/profile` dagi
 * kabi).
 *
 * Nega umuman tekshiriladi: savollar bazasi — mahsulotning asosiy
 * qiymati. Ochiq `public/` papkada tursa, uni butunlay ko'chirib olish
 * mumkin bo'lardi.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const user = await getVerifiedSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  const { key } = await params;
  try {
    const { bytes, mime } = await readQuestionImage(key);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mime,
        // Rasm hech qachon o'zgarmaydi (kalit — tasodifiy UUID), lekin
        // kesh SHAXSIY: javob sessiya bilan beriladi, umumiy kesh
        // (proxy, CDN) uni boshqa odamga bermasligi kerak.
        "Cache-Control": "private, max-age=31536000, immutable",
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    // Noto'g'ri kalit ham, mavjud bo'lmagan fayl ham — bir xil javob.
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return NextResponse.json({ error: "Rasm topilmadi" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "Noto'g'ri rasm kaliti") {
      return NextResponse.json({ error: "Rasm topilmadi" }, { status: 404 });
    }
    logError(error, { path: "/api/question-images/[key]", userId: user.id });
    throw error;
  }
}
