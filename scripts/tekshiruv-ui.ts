/**
 * UI tekshiruvi — ishlab turgan dev serverga HTTP so'rovlar yuboradi.
 *
 * Ishlatish:
 *   1. Dev serverni ishga tushiring:  npm run dev -- -p 3150
 *   2. Boshqa terminalda:             npx tsx scripts/tekshiruv-ui.ts
 *
 * Nega brauzer emas: bu kompyuterda ~4 GB RAM va brauzer avtomatlashtirish
 * vositasi og'ir. HTTP so'rov esa aynan shu narsani tekshiradi — server
 * qanday HTML chizadi.
 *
 * Nimani tekshiradi:
 *  - har bir rol o'z sahifalarini 200 bilan ochadimi;
 *  - sahifa xato ekraniga tushmaganmi;
 *  - kutilgan matn HTML'da bormi;
 *  - dizayn tokenlari va shriftlar CSS'ga yetib borganmi;
 *  - ruxsat chegaralari: rol o'zgalar sahifasiga kira olmaydimi.
 *
 * Qabulxona hisobi seed'da yo'q — skript uni O'ZI yaratadi va oxirida
 * O'CHIRADI. Boshqa hech narsa o'zgartirilmaydi.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const BASE = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3150";
const PASSWORD = process.env.TEST_PASSWORD ?? "testify123";

/** Skript yaratadigan vaqtinchalik qabulxona hisobi. */
const RECEPTION_EMAIL = "tekshiruv-qabulxona@testify.local";

const prisma = new PrismaClient();

type Check = { ok: boolean; label: string; detail?: string };
const results: Check[] = [];

function record(ok: boolean, label: string, detail?: string) {
  results.push({ ok, label, detail });
  console.log(`${ok ? "  OK  " : " XATO "} ${label}${detail ? ` — ${detail}` : ""}`);
}

async function login(email: string): Promise<string | null> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!res.ok) {
    record(false, `Kirish: ${email}`, `${res.status} ${await res.text()}`);
    return null;
  }
  const match = res.headers.get("set-cookie")?.match(/testify_session=([^;]+)/);
  if (!match) {
    record(false, `Kirish: ${email}`, "sessiya cookie'si qaytmadi");
    return null;
  }
  record(true, `Kirish: ${email}`);
  return `testify_session=${match[1]}`;
}

async function checkPage(cookie: string, path: string, mustContain: string[] = []) {
  const res = await fetch(`${BASE}${path}`, { headers: { cookie } });
  const html = await res.text();

  if (res.status !== 200) {
    record(false, `GET ${path}`, `javob ${res.status}`);
    return;
  }
  if (html.includes("Xatolik yuz berdi") && html.includes("Qayta urinish")) {
    record(false, `GET ${path}`, "xato ekrani chizilgan");
    return;
  }
  const missing = mustContain.filter((needle) => !html.includes(needle));
  if (missing.length > 0) {
    record(false, `GET ${path}`, `topilmadi: ${missing.join(", ")}`);
    return;
  }
  record(true, `GET ${path}`);
}

/**
 * Sahifa ruxsat yo'qligi sababli boshqa joyga yo'naltirishini tekshiradi.
 *
 * `loading.tsx` bor sahifada `redirect()` 307 emas, 200 javobi ICHIDA
 * keladi (`muhim.md`) — shuning uchun ikkala ko'rinish ham qabul qilinadi.
 */
async function checkDenied(cookie: string, path: string, label: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { cookie }, redirect: "manual" });
  const html = res.status === 200 ? await res.text() : "";
  const denied =
    res.status === 307 ||
    res.status === 302 ||
    res.status === 403 ||
    res.status === 404 ||
    html.includes("NEXT_REDIRECT") ||
    html.includes('http-equiv="refresh"');
  record(denied, label, denied ? undefined : `javob ${res.status}`);
}

/** Qabulxona hisobini yaratadi (yoki bor bo'lsa parolini tiklaydi). */
async function ensureReceptionAccount(): Promise<string | null> {
  const director = await prisma.user.findFirst({
    where: { email: "director@testify.dev" },
    select: { organizationId: true },
  });
  if (!director?.organizationId) {
    record(false, "Qabulxona hisobi", "director@testify.dev yoki uning tashkiloti topilmadi");
    return null;
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: RECEPTION_EMAIL },
    update: { passwordHash, isActive: true },
    create: {
      email: RECEPTION_EMAIL,
      name: "Tekshiruv Qabulxona",
      passwordHash,
      role: "RECEPTION",
      organizationId: director.organizationId,
    },
    select: { id: true },
  });
  record(true, "Qabulxona hisobi yaratildi (vaqtinchalik)");
  return user.id;
}

async function main() {
  // ——— 1. Kirish sahifasi (sessiyasiz)
  const loginHtml = await (await fetch(`${BASE}/login`)).text();
  record(loginHtml.includes("Hisobingizga kiring"), "Kirish sahifasi: sarlavha");
  record(loginHtml.includes("Xush kelibsiz"), "Kirish sahifasi: eyebrow");

  // ——— 2. Dizayn tokenlari CSS'ga chiqqanmi
  const cssMatch = loginHtml.match(/href="(\/_next\/static\/[^"]+\.css)"/);
  if (!cssMatch) {
    record(false, "CSS fayli topildi");
  } else {
    const css = await (await fetch(`${BASE}${cssMatch[1]}`)).text();
    record(css.includes("#0ea79a"), "Token: brend turkuaz");
    record(css.includes("#0b1930"), "Token: navy sidebar");
    record(css.includes("--font-space-grotesk"), "Shrift: Space Grotesk");
    record(css.includes("--font-dm-sans"), "Shrift: DM Sans");
    record(css.includes("box-shadow"), "Soya: box-shadow bor");
    record(css.includes("@media print"), "Chop etish uslubi bor");
  }

  // ——— 3. O'quvchi
  const student = await login("student1@testify.dev");
  if (student) {
    await checkPage(student, "/student", ["Keyingi qadam", "Tayyorgarlik", "Biletlar"]);
    for (const path of [
      "/student/mashq",
      "/student/bilet",
      "/student/imtihon",
      "/student/maraton",
      "/student/xatolarim",
      "/student/tolov",
      "/profil",
      "/bildirishnomalar",
    ]) {
      await checkPage(student, path);
    }
    await checkDenied(student, "/director", "O'quvchi /director ga kira olmaydi");
  }

  // ——— 4. Direktor: panel + uchta jurnal
  const director = await login("director@testify.dev");
  if (director) {
    await checkPage(director, "/director", ["Bugungi ish", "Guruhlar", "Ustozlar"]);
    await checkPage(director, "/director/tolovlar");

    await checkPage(director, "/director/guruhlar", ["Guruhlar jurnali", "Amallar"]);
    await checkPage(director, "/director/guruhlar?filtr=jim");
    await checkPage(director, "/director/guruhlar?filtr=bosh");
    await checkPage(director, "/director/guruhlar?filtr=etibor");
    await checkPage(director, "/director/guruhlar?q=test");

    await checkPage(director, "/director/ustozlar", ["Ustozlar jurnali", "Amallar"]);
    await checkPage(director, "/director/ustozlar?filtr=guruhsiz");
    await checkPage(director, "/director/ustozlar?filtr=jim");
    await checkPage(director, "/director/ustozlar?filtr=bloklangan");

    await checkPage(director, "/director/oquvchilar", ["quvchilar jurnali"]);
    await checkPage(director, "/director/oquvchilar?filtr=jim");
    await checkPage(director, "/director/oquvchilar?filtr=bloklangan");
    await checkPage(director, "/director/oquvchilar?filtr=etibor");
  }

  // ——— 5. Qabulxona (vaqtinchalik hisob)
  const receptionId = await ensureReceptionAccount();
  if (receptionId) {
    const reception = await login(RECEPTION_EMAIL);
    if (reception) {
      await checkPage(reception, "/qabulxona", ["Bugungi ish"]);
      await checkPage(reception, "/qabulxona/oquvchilar");
      await checkPage(reception, "/qabulxona/tolovlar");
      // Qabulxona direktorning jurnallariga kira olmasligi kerak.
      await checkDenied(reception, "/director/guruhlar", "Qabulxona /director/guruhlar ga kira olmaydi");
      await checkDenied(reception, "/director/ustozlar", "Qabulxona /director/ustozlar ga kira olmaydi");
    }
  }

  // ——— 6. Ustoz va owner
  const tutor = await login("tutor@testify.dev");
  if (tutor) {
    await checkPage(tutor, "/tutor");
    await checkDenied(tutor, "/director/guruhlar", "Ustoz /director/guruhlar ga kira olmaydi");
    await checkDenied(tutor, "/qabulxona", "Ustoz /qabulxona ga kira olmaydi");
  }

  const owner = await login("owner@testify.dev");
  if (owner) {
    await checkPage(owner, "/owner");
    await checkPage(owner, "/owner/questions");
  }
}

async function cleanup() {
  // Skript yaratgan hamma narsani o'chiradi. `deleteMany` ataylab:
  // hisob yaratilmagan bo'lsa ham xato bermaydi.
  const deleted = await prisma.user.deleteMany({ where: { email: RECEPTION_EMAIL } });
  if (deleted.count > 0) {
    console.log(`\nTozalandi: vaqtinchalik qabulxona hisobi o'chirildi.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    record(false, "Skript xatosi", String(error));
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();

    const failed = results.filter((r) => !r.ok);
    console.log(`\n${results.length - failed.length}/${results.length} tekshiruv o'tdi.`);
    if (failed.length > 0) {
      console.log("O'tmaganlar:");
      for (const f of failed) {
        console.log(`  - ${f.label}${f.detail ? ` (${f.detail})` : ""}`);
      }
      process.exit(1);
    }
  });
