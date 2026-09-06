import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/logger";

// Monitoring uchun ochiq endpoint — sessiya talab qilmaydi, faqat
// bazaga ulanish holatini qaytaradi. Maxfiy ma'lumot chiqarilmaydi.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "ok" });
  } catch (error) {
    logError(error, { path: "/api/health" });
    return NextResponse.json({ status: "error", db: "error" }, { status: 503 });
  }
}
