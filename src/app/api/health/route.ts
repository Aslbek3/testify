import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";
import { checkDatabaseConnection } from "@/services/health";

// Monitoring uchun ochiq endpoint — sessiya talab qilmaydi, faqat
// bazaga ulanish holatini qaytaradi. Maxfiy ma'lumot chiqarilmaydi.
export const dynamic = "force-dynamic";

export async function GET() {
  const health = await checkDatabaseConnection();

  if (!health.ok) {
    logError(health.error, { path: "/api/health" });
    return NextResponse.json({ status: "error", db: "error" }, { status: 503 });
  }

  return NextResponse.json({ status: "ok", db: "ok" });
}
