import { NextResponse } from "next/server";

/**
 * Client komponentlarda (masalan error.tsx) ushlangan xatolarni serverga
 * ko'chirib, PM2 log fayliga structured JSON qatori sifatida yozadi.
 * Kirish ma'lumoti ishonchsiz — qayta strukturalanadi, faqat kutilgan
 * maydonlar saqlanadi, xabar uzunligi cheklanadi.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const entry = {
    level: "error",
    time: new Date().toISOString(),
    source: "client",
    path: typeof data.path === "string" ? data.path.slice(0, 500) : null,
    userId: typeof data.userId === "string" ? data.userId.slice(0, 200) : null,
    message: typeof data.message === "string" ? data.message.slice(0, 2000) : "unknown",
  };

  console.error(JSON.stringify(entry));
  return NextResponse.json({ ok: true });
}
