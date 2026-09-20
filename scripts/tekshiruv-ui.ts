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

/** Skript ishga tushgan vaqt — tozalashda shundan keyingi yozuvlar o'chiriladi. */
const startedRunAt = new Date();

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

/** Sahifa 404 berishini tekshiradi — begona obyektga kirishga urinish. */
async function checkNotFound(cookie: string, path: string, label: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { cookie } });
  record(res.status === 404, label, res.status === 404 ? undefined : `javob ${res.status}`);
}

/** Eski manzil yangisiga yo'naltirishini tekshiradi. */
async function checkRedirectsTo(
  cookie: string,
  from: string,
  to: string,
  label: string
) {
  const res = await fetch(`${BASE}${from}`, { headers: { cookie }, redirect: "manual" });
  const location = res.headers.get("location");
  if (location) {
    const ok = location.endsWith(to);
    record(ok, label, ok ? undefined : `-> ${location}`);
    return;
  }
  // `loading.tsx` bor sahifada redirect 200 javobi ichida keladi (muhim.md).
  const html = await res.text();
  const ok = html.includes(to);
  record(ok, label, ok ? undefined : `javob ${res.status}, manzil topilmadi`);
}

/**
 * Tekshiruv uchun haqiqiy ID'lar.
 *
 * ⚠️ Guruh AYNAN test ustozining guruhi bo'lishi shart. Ilgari bu yerda
 * `prisma.group.findFirst()` turardi — u bazadagi BIRINCHI guruhni olardi
 * va u boshqa tashkilotniki bo'lib chiqdi. Natijada sahifalar 404 berdi
 * va bu "xato" deb yozildi, aslida ruxsat tekshiruvi to'g'ri ishlagan edi.
 * Test o'zining ma'lumotini aniq tanlashi kerak, aks holda u kodni emas,
 * bazaning tasodifiy holatini tekshiradi.
 */
async function loadSampleIds() {
  const tutor = await prisma.user.findFirst({
    where: { email: "tutor@testify.dev" },
    select: { id: true, organizationId: true },
  });
  if (!tutor?.organizationId) {
    record(false, "Namuna ID'lar", "tutor@testify.dev topilmadi");
    return null;
  }

  // O'quvchisi bor guruh afzal — o'quvchi sahifasi ham tekshirilsin.
  const groups = await prisma.group.findMany({
    where: { tutorId: tutor.id, organizationId: tutor.organizationId },
    select: { id: true, students: { select: { userId: true }, take: 1 } },
  });
  const group = groups.find((g) => g.students.length > 0) ?? groups[0];
  if (!group) {
    record(false, "Namuna ID'lar", "test ustozining guruhi topilmadi");
    return null;
  }

  // Boshqa tashkilotning guruhi — ruxsat chegarasini tekshirish uchun.
  const foreignGroup = await prisma.group.findFirst({
    where: { organizationId: { not: tutor.organizationId } },
    select: { id: true },
  });

  return {
    groupId: group.id,
    tutorId: tutor.id,
    studentId: group.students[0]?.userId ?? null,
    foreignGroupId: foreignGroup?.id ?? null,
  };
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

    // Test ekrani — urinish yaratadi, shuning uchun oxirida tozalanadi
    // (pastdagi `cleanup`). Bu sahifa o'quvchining eng ko'p vaqt
    // o'tkazadigan joyi, ya'ni uni tekshirmaslik mumkin emas.
    // `/student/test?mode=PRACTICE` urinish YARATADI va `?attemptId=...`
    // ga yo'naltiradi. Next'ning `redirect()`i 200 javobi ichida keladi
    // (muhim.md), ya'ni `fetch` uni o'zi kuzatmaydi — manzilni qo'lda
    // ajratib olib, ikkinchi so'rov yuboriladi.
    const startRes = await fetch(`${BASE}/student/test?mode=PRACTICE`, {
      headers: { cookie: student },
    });
    const startHtml = await startRes.text();
    const attemptMatch = startHtml.match(/attemptId=([a-z0-9]+)/i);
    record(
      startRes.status === 200 && attemptMatch !== null,
      "Mashq urinishi boshlandi",
      attemptMatch ? undefined : `javob ${startRes.status}, attemptId topilmadi`
    );

    if (attemptMatch) {
      const runnerHtml = await (
        await fetch(`${BASE}/student/test?attemptId=${attemptMatch[1]}`, {
          headers: { cookie: student },
        })
      ).text();
      record(runnerHtml.includes("Savollar holati"), "Test ekrani chizildi");
      // To'q qobiq — savol oq matnda, fon navy.
      record(runnerHtml.includes("111c2e"), "Test ekrani to'q qobiqda");
    }
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

  // ——— 4b. Birlashgan obyekt sahifalari
  const ids = await loadSampleIds();
  if (director && ids) {
    await checkPage(director, `/guruh/${ids.groupId}`, ["O&#x27;quvchilar"]);
    await checkPage(director, `/ustoz/${ids.tutorId}`, ["Guruhlari"]);
    if (ids.studentId) {
      await checkPage(director, `/oquvchi/${ids.studentId}`);
    }
    // Eski manzillar yangisiga yo'naltiradi
    await checkRedirectsTo(
      director,
      `/director/guruh/${ids.groupId}`,
      `/guruh/${ids.groupId}`,
      "Eski /director/guruh/[id] -> /guruh/[id]"
    );
    await checkRedirectsTo(
      director,
      `/director/ustoz/${ids.tutorId}`,
      `/ustoz/${ids.tutorId}`,
      "Eski /director/ustoz/[id] -> /ustoz/[id]"
    );
    // Mavjud bo'lmagan guruh — 404
    await checkNotFound(director, "/guruh/yoq-bunday-id", "Mavjud bo'lmagan guruh 404 beradi");
    if (ids.foreignGroupId) {
      await checkNotFound(
        director,
        `/guruh/${ids.foreignGroupId}`,
        "Boshqa tashkilotning guruhi 404 beradi"
      );
    }
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
      // Qabulxona guruh va o'quvchi sahifalarini KO'RADI — ilgari
      // bu sahifalar umuman yo'q edi.
      if (ids) {
        await checkPage(reception, `/guruh/${ids.groupId}`);
        if (ids.studentId) await checkPage(reception, `/oquvchi/${ids.studentId}`);
      }
    }
  }

  // ——— 6. Ustoz va owner
  const tutor = await login("tutor@testify.dev");
  if (tutor) {
    await checkPage(tutor, "/tutor");
    await checkDenied(tutor, "/director/guruhlar", "Ustoz /director/guruhlar ga kira olmaydi");
    await checkDenied(tutor, "/qabulxona", "Ustoz /qabulxona ga kira olmaydi");
    if (ids) {
      await checkPage(tutor, `/guruh/${ids.groupId}`);
      if (ids.studentId) await checkPage(tutor, `/oquvchi/${ids.studentId}`);
      await checkRedirectsTo(
        tutor,
        `/tutor/guruh/${ids.groupId}`,
        `/guruh/${ids.groupId}`,
        "Eski /tutor/guruh/[id] -> /guruh/[id]"
      );
    }
  }

  const owner = await login("owner@testify.dev");
  if (owner) {
    await checkPage(owner, "/owner");
    await checkPage(owner, "/owner/questions");
  }
}

async function cleanup() {
  // Skript yaratgan hamma narsani o'chiradi. `deleteMany` ataylab:
  // hech narsa yaratilmagan bo'lsa ham xato bermaydi.
  const deletedUsers = await prisma.user.deleteMany({
    where: { email: RECEPTION_EMAIL },
  });

  // Test ekrani tekshiruvi yaratgan urinishlar. Faqat SHU ishga
  // tushirishda (startedAt >= startedRunAt) yaratilganlari o'chiriladi —
  // o'quvchining haqiqiy tarixiga tegilmaydi.
  const student = await prisma.user.findFirst({
    where: { email: "student1@testify.dev" },
    select: { id: true },
  });
  let deletedAttempts = 0;
  if (student) {
    // Javoblar avval: `AttemptAnswer` urinishga bog'langan.
    const attempts = await prisma.attempt.findMany({
      where: { studentId: student.id, startedAt: { gte: startedRunAt } },
      select: { id: true },
    });
    if (attempts.length > 0) {
      const ids = attempts.map((a) => a.id);
      await prisma.attemptAnswer.deleteMany({ where: { attemptId: { in: ids } } });
      const res = await prisma.attempt.deleteMany({ where: { id: { in: ids } } });
      deletedAttempts = res.count;
    }
  }

  const parts: string[] = [];
  if (deletedUsers.count > 0) parts.push("vaqtinchalik qabulxona hisobi");
  if (deletedAttempts > 0) parts.push(`${deletedAttempts} ta test urinishi`);
  if (parts.length > 0) {
    console.log(`\nTozalandi: ${parts.join(" va ")} o'chirildi.`);
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
