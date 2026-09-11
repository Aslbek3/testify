import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth";
import { isStudent } from "@/lib/permissions";
import { logError } from "@/lib/logger";
import { isStudentPaymentMonths, MAX_RECEIPT_BYTES } from "@/lib/payments";
import { submitStudentPayment, StudentPaymentError } from "@/services/studentPayments";

/**
 * O'quvchi chek bilan to'lov xabarini yuboradi (multipart/form-data:
 * `months`, `receipt`).
 *
 * To'lovchi va avtomaktab sessiyadan olinadi, so'rovdan emas — o'quvchi
 * boshqa birovning nomidan yubora olmaydi. Summa ham so'rovda yo'q:
 * u avtomaktab narxidan serverda hisoblanadi.
 */
export async function POST(request: Request) {
  const user = await getVerifiedSessionUser();
  if (!user || !isStudent(user)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  // Hajm butun fayl xotiraga o'qilishidan OLDIN tekshiriladi. Sarlavha
  // yolg'on bo'lishi mumkin — shu sabab service'da haqiqiy hajm ham
  // qayta tekshiriladi; bu esa ochiqchasiga katta so'rovni erta to'xtatadi.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_RECEIPT_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "Chek hajmi 5 MB dan oshmasligi kerak" }, { status: 413 });
  }

  const form = await request.formData().catch(() => null);
  const months = Number(form?.get("months"));
  const receipt = form?.get("receipt");

  if (!isStudentPaymentMonths(months)) {
    return NextResponse.json({ error: "Muddat 1 yoki 6 oy bo'lishi kerak" }, { status: 400 });
  }
  if (!(receipt instanceof File)) {
    return NextResponse.json({ error: "Chek fayli yuklanmagan" }, { status: 400 });
  }

  try {
    await submitStudentPayment({
      studentId: user.id,
      months,
      receipt: new Uint8Array(await receipt.arrayBuffer()),
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof StudentPaymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logError(error, { path: "/api/student-payments", userId: user.id });
    throw error;
  }
}
