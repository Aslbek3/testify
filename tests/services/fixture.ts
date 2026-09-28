import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Servis testlari uchun umumiy ma'lumot — tashkilot, guruh, ustoz,
 * o'quvchi, mavzu va savollar.
 *
 * Nega bu testlar `npm test` ga QO'SHILMAYDI: bu yerdagi hammasi
 * HAQIQIY bazaga boradi (`.env` dagi `DATABASE_URL`). `npm test` esa
 * CI'da bazasiz ishlaydi — shu sabab papka alohida (`tests/services/`)
 * va skript ham alohida (`npm run test:services`). `tests/*.test.ts`
 * glob'i pastki papkani tutmaydi, ya'ni ajralish o'z-o'zidan ta'minlanadi.
 *
 * ⚠️ Seed ma'lumotiga (`seed-*` ID'lari) TEGILMAYDI. Har bir test fayli
 * o'zining `prefix` i bilan yozadi va oxirida faqat shuni o'chiradi —
 * `scripts/tekshiruv-ui.ts` dagi `cleanup()` bilan bir xil qoida.
 *
 * Prefiks har ishga tushirishda TASODIFIY: node:test fayllarni alohida
 * jarayonlarda ishga tushiradi va oldingi ishga tushirish yarim yo'lda
 * uzilgan bo'lsa (Ctrl+C), qolib ketgan yozuv yangisiga xalaqit
 * bermasligi kerak.
 */

export type Fixture = Awaited<ReturnType<typeof createFixture>>;

/**
 * @param label fayl nomi — qolib ketgan yozuv qaysi testdan ekani
 *   bazaga qarab ham bilinsin.
 */
export async function createFixture(label: string) {
  await sweepStaleFixtures();

  const suffix = `${label}-${randomUUID().slice(0, 8)}`;
  const prefix = `${ID_PREFIX}${suffix}-`;

  const organization = await prisma.organization.create({
    data: {
      id: `${prefix}org`,
      name: `Birlik test avtomaktabi ${suffix}`,
      city: "Toshkent",
      status: "ACTIVE",
    },
  });

  const tutor = await prisma.user.create({
    data: {
      id: `${prefix}tutor`,
      name: "Birlik test ustozi",
      email: `${prefix}tutor@testify.local`,
      // Haqiqiy hash kerak emas: bu testlar kirish oqimidan o'tmaydi,
      // servis funksiyalarini bevosita chaqiradi.
      passwordHash: "birlik-test-hash-emas",
      role: "TUTOR",
      organizationId: organization.id,
    },
  });

  const group = await prisma.group.create({
    data: {
      id: `${prefix}group`,
      name: `Birlik test guruhi ${suffix}`,
      tutorId: tutor.id,
      organizationId: organization.id,
    },
  });

  const student = await prisma.user.create({
    data: {
      id: `${prefix}student`,
      name: "Birlik test o'quvchisi",
      email: `${prefix}student@testify.local`,
      passwordHash: "birlik-test-hash-emas",
      role: "STUDENT",
      organizationId: organization.id,
      studentProfile: { create: { id: `${prefix}profile`, groupId: group.id } },
    },
  });

  const topic = await prisma.topic.create({
    data: { id: `${prefix}topic`, name: `Birlik test mavzusi ${suffix}` },
  });

  return { prefix, suffix, organization, tutor, group, student, topic };
}

/**
 * Testning o'z savollari.
 *
 * Savol matni ham prefiksli: `questionImport` testi takror savolni
 * matn bo'yicha aniqlaydi, ya'ni matn boshqa testlar bilan
 * to'qnashmasligi kerak.
 */
export async function createQuestions(
  fixture: Fixture,
  count: number
): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 1; i <= count; i += 1) {
    const question = await prisma.question.create({
      data: {
        id: `${fixture.prefix}q${i}`,
        topicId: fixture.topic.id,
        text: `Birlik test savoli ${i} (${fixture.suffix})`,
        options: ["A", "B", "C"],
        correctOptionIndex: 0,
      },
      select: { id: true },
    });
    ids.push(question.id);
  }
  return ids;
}

/**
 * Test yaratgan HAMMA narsani o'chiradi.
 *
 * Tartib bog'liqlik bo'yicha: javob → urinish → savol/xatcho'p/shikoyat →
 * dars → profil → foydalanuvchi → guruh → mavzu → tashkilot. Prisma'da
 * `onDelete: Cascade` hammasida yo'q (masalan `Attempt.student`), shuning
 * uchun qo'lda ketma-ketlik kerak.
 *
 * Mavzular ikki yo'l bilan topiladi: ID prefiksi bo'yicha (fixture
 * yaratgani) va NOM ichidagi suffiks bo'yicha (`questionImport` o'zi
 * yaratgani — uning ID'si cuid, oldindan ma'lum emas).
 */
export async function cleanupFixture(fixture: Fixture): Promise<void> {
  await cleanupByPrefix(fixture.prefix, fixture.suffix);
}

async function cleanupByPrefix(prefix: string, suffix: string): Promise<void> {
  const topics = await prisma.topic.findMany({
    where: {
      OR: [{ id: { startsWith: prefix } }, { name: { contains: suffix } }],
    },
    select: { id: true },
  });
  const topicIds = topics.map((t) => t.id);

  const questions = await prisma.question.findMany({
    where: { topicId: { in: topicIds } },
    select: { id: true },
  });
  const questionIds = questions.map((q) => q.id);

  const attempts = await prisma.attempt.findMany({
    where: { OR: [{ studentId: { startsWith: prefix } }, { groupId: { startsWith: prefix } }] },
    select: { id: true },
  });
  const attemptIds = attempts.map((a) => a.id);

  if (attemptIds.length > 0) {
    await prisma.attemptAnswer.deleteMany({ where: { attemptId: { in: attemptIds } } });
    await prisma.attempt.deleteMany({ where: { id: { in: attemptIds } } });
  }

  if (questionIds.length > 0) {
    // Savolga bog'langan begona yozuv bo'lmasligi kerak, lekin
    // `deleteMany` xato bermaydi va o'chirish tartibini buzmaydi.
    await prisma.attemptAnswer.deleteMany({ where: { questionId: { in: questionIds } } });
    await prisma.savedQuestion.deleteMany({ where: { questionId: { in: questionIds } } });
    await prisma.questionReport.deleteMany({ where: { questionId: { in: questionIds } } });
    await prisma.question.deleteMany({ where: { id: { in: questionIds } } });
  }

  await prisma.savedQuestion.deleteMany({ where: { studentId: { startsWith: prefix } } });
  await prisma.questionReport.deleteMany({ where: { reportedById: { startsWith: prefix } } });
  await prisma.lesson.deleteMany({ where: { groupId: { startsWith: prefix } } });
  await prisma.studentProfile.deleteMany({ where: { userId: { startsWith: prefix } } });
  // Guruh foydalanuvchidan OLDIN: `Group.tutorId` FK'si `RESTRICT`, ya'ni
  // ustozni guruhi turganda o'chirib bo'lmaydi.
  await prisma.group.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } });
  if (topicIds.length > 0) {
    await prisma.topic.deleteMany({ where: { id: { in: topicIds } } });
  }
  await prisma.organization.deleteMany({ where: { id: { startsWith: prefix } } });
}

/** Umumiy prefiks — barcha birlik testlarining yozuvlari shu bilan boshlanadi. */
const ID_PREFIX = "birlik-test-";

/** Qolib ketgan yozuv shu muddatdan keyin "eskirgan" hisoblanadi. */
const STALE_AFTER_MS = 60 * 60 * 1000;

/**
 * Oldingi ishga tushirishdan QOLIB KETGAN yozuvlarni supuradi.
 *
 * Nega kerak: test Ctrl+C bilan uzilsa yoki `cleanupFixture` ning o'zi
 * yiqilsa (bir marta shunday bo'ldi — `Group.tutorId` FK'si tufayli
 * o'chirish tartibi noto'g'ri edi), yozuvlar dev bazada qolib ketadi.
 * Ular hech kimga ko'rinmaydi, lekin baza asta-sekin soxta tashkilot va
 * guruhlar bilan to'ladi va "20 ta guruh bor" degan statistika yolg'on
 * bo'lib qoladi.
 *
 * Bir soatlik chegara ATAYLAB: shu paytda ishlab turgan boshqa test
 * jarayonining (`--test-concurrency` o'zgarsa yoki ikki terminalda
 * ishga tushirilsa) ma'lumotiga tegilmasin.
 *
 * Tashkilot ID'sidan prefiks tiklanadi: u `<prefiks>org` ko'rinishida.
 */
async function sweepStaleFixtures(): Promise<void> {
  const stale = await prisma.organization.findMany({
    where: {
      id: { startsWith: ID_PREFIX },
      createdAt: { lt: new Date(Date.now() - STALE_AFTER_MS) },
    },
    select: { id: true },
  });

  for (const org of stale) {
    const prefix = org.id.replace(/org$/, "");
    // Suffiks — prefiksning `birlik-test-` dan keyingi qismi, oxirgi
    // tiresiz. `questionImport` yaratgan mavzular nomida aynan shu turadi.
    const suffix = prefix.slice(ID_PREFIX.length).replace(/-$/, "");
    await cleanupByPrefix(prefix, suffix);
    console.log(`Qolib ketgan test ma'lumoti o'chirildi: ${prefix}`);
  }
}

/**
 * Ulanishni yopadi — har bir test faylining oxirgi `after` hook'ida.
 *
 * Usiz jarayon testlar tugagandan keyin ham Prisma pool'i ochiq bo'lgani
 * uchun osilib turadi. `cleanupFixture` ichida qilinmaydi: u har testdan
 * keyin chaqiriladi va ulanishni har safar uzib-ulash bekorga sekinlik.
 */
export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Tashkilot ICHIDA alohida ustoz + guruh + o'quvchi.
 *
 * Nega kerak: `finalizeExpiredAttemptsIn` QAMROV bo'yicha ishlaydi va
 * qaytargan soni to'g'ri ekanini tekshirish uchun har bir qamrov testi
 * o'z ma'lumotiga ega bo'lishi kerak — aks holda bir test ikkinchisining
 * urinishini yopib qo'yadi va son mos kelmaydi.
 */
export async function createUnit(fixture: Fixture, key: string) {
  const tutor = await prisma.user.create({
    data: {
      id: `${fixture.prefix}tutor-${key}`,
      name: `Ustoz ${key}`,
      email: `${fixture.prefix}tutor-${key}@testify.local`,
      passwordHash: "birlik-test-hash-emas",
      role: "TUTOR",
      organizationId: fixture.organization.id,
    },
  });
  const group = await prisma.group.create({
    data: {
      id: `${fixture.prefix}group-${key}`,
      name: `Guruh ${key}`,
      tutorId: tutor.id,
      organizationId: fixture.organization.id,
    },
  });
  const student = await prisma.user.create({
    data: {
      id: `${fixture.prefix}student-${key}`,
      name: `O'quvchi ${key}`,
      email: `${fixture.prefix}student-${key}@testify.local`,
      passwordHash: "birlik-test-hash-emas",
      role: "STUDENT",
      organizationId: fixture.organization.id,
      studentProfile: { create: { id: `${fixture.prefix}profile-${key}`, groupId: group.id } },
    },
  });
  return { tutor, group, student };
}
