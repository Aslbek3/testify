import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { canViewStudentPayment } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { readReceipt } from "@/lib/receiptStorage";
import { getStudentPaymentRef } from "@/services/studentPayments";

/**
 * Chek faylini beradi — faqat o'quvchining o'ziga, shu avtomaktab
 * direktoriga va qabulxonasiga (`canViewStudentPayment`).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getVerifiedSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  const { id } = await params;
  const payment = await getStudentPaymentRef(id);
  // Topilmadi va ruxsat yo'q — bir xil 404.
  if (!payment || !canViewStudentPayment(user, payment)) {
    return NextResponse.json({ error: "To'lov topilmadi" }, { status: 404 });
  }
  if (!payment.receiptKey || !payment.receiptMime) {
    return NextResponse.json({ error: "Bu to'lovda chek yo'q" }, { status: 404 });
  }

  try {
    const file = await readReceipt(payment.receiptKey);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        // Tur saqlash paytida fayl baytlaridan aniqlangan — so'rovdagi
        // qiymat emas.
        "Content-Type": payment.receiptMime,
        "Content-Disposition": "inline",
        // Brauzer turini o'zicha "taxmin qilmasin" — aks holda rasm
        // sifatida saqlangan fayl HTML deb talqin qilinishi mumkin edi.
        "X-Content-Type-Options": "nosniff",
        // Maxfiy hujjat: umumiy keshlarda (proxy) saqlanmasin.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    logError(error, { path: "/api/student-payments/[id]/receipt", userId: user.id });
    return NextResponse.json({ error: "Chek faylini o'qib bo'lmadi" }, { status: 500 });
  }
}
