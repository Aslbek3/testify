import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
// Kontent (mavzu va savollar) alohida faylda — sababi
// `seedContent.ts` izohida: uni import qilish seed'ni ishga
// tushirib yubormasligi kerak.
import { TOPIC_DEFS, slugify } from "./seedContent";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;
const SEED_PASSWORD = "testify123";

// Deterministik pseudo-tasodifiy generator — har safar bir xil natija beradi,
// shu bilan seed idempotent (upsert bilan) va takrorlanuvchan bo'ladi.
function seedRandom(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function next() {
    h = Math.imul(h ^ (h >>> 16), 2246822519);
    h = Math.imul(h ^ (h >>> 13), 3266489917);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

// DEMO ma'lumot: quyidagi savollar YHQ qoidalaridan umumiy tarzda olingan
// namuna kontent, rasmiy imtihon savollari EMAS — mazmunan to'g'ri bo'lishga
// harakat qilingan, lekin ishlab chiqarish (production) uchun rasmiy manba
// asosida qayta ko'rib chiqilishi kerak. imageUrl'lar ham DEMO —
// public/questions/ ichidagi sodda SVG chizmalar, keyinchalik haqiqiy
// fotosuratlar/rasmlar bilan almashtiriladi.


const STUDENT_NAMES = [
  "Dilnoza Egamberdiyeva",
  "Javlon Mirzayev",
  "Gulbahor Tosheva",
  "Sevinch Qodirova",
  "Farrux Abdullayev",
  "Malika Umarova",
  "Otabek Ergashev",
  "Madina Yusupova",
];

async function upsertUser(input: {
  email: string;
  name: string;
  role: "OWNER" | "DIRECTOR" | "TUTOR";
  organizationId?: string;
}) {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS);
  return prisma.user.upsert({
    where: { email: input.email },
    update: {},
    create: {
      email: input.email,
      name: input.name,
      passwordHash,
      role: input.role,
      organizationId: input.organizationId,
    },
  });
}

async function main() {
  const owner = await upsertUser({
    email: "owner@testify.dev",
    name: "Aslbek (App Owner)",
    role: "OWNER",
  });

  const organization = await prisma.organization.upsert({
    where: { id: "seed-org-1" },
    update: {},
    create: {
      id: "seed-org-1",
      name: "Nam-Avto O'quv Markazi",
      city: "Namangan",
      plan: "STANDARD",
      status: "ACTIVE",
    },
  });

  const director = await upsertUser({
    email: "director@testify.dev",
    name: "Otabek Yusupov",
    role: "DIRECTOR",
    organizationId: organization.id,
  });

  const tutor = await upsertUser({
    email: "tutor@testify.dev",
    name: "Sardor Islomov",
    role: "TUTOR",
    organizationId: organization.id,
  });

  const group = await prisma.group.upsert({
    where: { id: "seed-group-1" },
    update: {},
    create: {
      id: "seed-group-1",
      name: "Guruh #14",
      tutorId: tutor.id,
      organizationId: organization.id,
    },
  });

  // ---- Mavzular va savollar ----
  const topics = [];
  for (const t of TOPIC_DEFS) {
    const topic = await prisma.topic.upsert({
      where: { id: `seed-topic-${slugify(t.name)}` },
      // `update` da ham category bor: TOPIC_DEFS o'zgarsa, allaqachon
      // mavjud mavzuga ham yetib borsin.
      update: { category: t.category },
      create: {
        id: `seed-topic-${slugify(t.name)}`,
        name: t.name,
        category: t.category,
      },
    });
    const questions = [];
    for (let i = 0; i < t.questions.length; i++) {
      const q = t.questions[i];
      // `update` ham to'liq to'ldirilgan — aks holda TOPIC_DEFS'dagi matn/izoh/
      // rasm o'zgarishlari allaqachon mavjud qatorlarga hech qachon
      // yetib bormas edi (upsert faqat yangi qator yaratganda ishlardi).
      const questionData = {
        topicId: topic.id,
        text: q.text,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        explanation: q.explanation,
        legalReference: q.legalReference ?? null,
        imageUrl: q.imageUrl,
        imageAlt: q.imageAlt,
      };
      const question = await prisma.question.upsert({
        where: { id: `${topic.id}-q${i}` },
        update: questionData,
        create: { id: `${topic.id}-q${i}`, ...questionData },
      });
      questions.push(question);
    }
    topics.push({ topic, questions });
  }
  const allQuestions = topics.flatMap((t) => t.questions);

  // ---- Biletlar ----
  // Bilet — savollarning TARTIBLI ro'yxati (alohida jadval emas,
  // `Question.ticketNumber` + `ticketOrder`). Real imtihonda bitta
  // biletda 20 ta savol bo'ladi.
  //
  // Bazadagi savollar hammasi bitta mavzudan bo'lib qolmasligi uchun
  // mavzular bo'ylab NAVBAT bilan olinadi: aks holda 1-bilet butunlay
  // "Yo'l belgilari" dan iborat bo'lib, bilet rejimining ma'nosi
  // yo'qolardi.
  //
  // ⚠️ Bu NAMUNA: savollar bazasi to'lgach biletlar haqiqiy manbadan
  // (import orqali) keladi va bu blok olib tashlanadi.
  {
    const TICKET_SIZE = 16;
    const TICKET_COUNT = 4;

    // Avval eski biriktirishlarni tozalaymiz. Ularsiz bilet soni yoki
    // hajmi o'zgarganda eski taqsimot qolib ketardi: 2 ta biletdan 4
    // taga o'tilganda bazada aralash holat paydo bo'lgan edi
    // (`scripts/assign-sample-tickets.ts` ham shu qoidaga amal qiladi).
    await prisma.question.updateMany({
      where: { ticketNumber: { not: null } },
      data: { ticketNumber: null, ticketOrder: null },
    });

    // Mavzular bo'ylab navbat bilan ("round-robin") tekis ro'yxat.
    const mixed: typeof allQuestions = [];
    for (let i = 0; ; i += 1) {
      const before = mixed.length;
      for (const t of topics) {
        if (t.questions[i]) mixed.push(t.questions[i]);
      }
      if (mixed.length === before) break;
    }

    let assigned = 0;
    for (let ticket = 1; ticket <= TICKET_COUNT; ticket += 1) {
      for (let order = 1; order <= TICKET_SIZE; order += 1) {
        const question = mixed[assigned];
        if (!question) break;
        await prisma.question.update({
          where: { id: question.id },
          data: { ticketNumber: ticket, ticketOrder: order },
        });
        assigned += 1;
      }
    }
    console.log(
      `  Biletlar: ${TICKET_COUNT} ta bilet, ${assigned} ta savol biriktirildi`
    );
  }

  // ---- O'quvchilar ----
  const students = [];
  for (let i = 0; i < STUDENT_NAMES.length; i++) {
    const name = STUDENT_NAMES[i];
    const email = `student${i + 1}@testify.dev`;
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS);
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name,
        passwordHash,
        role: "STUDENT",
        organizationId: organization.id,
      },
    });
    await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, groupId: group.id },
    });
    students.push(user);
  }

  // ---- Urinishlar (Attempt + AttemptAnswer) ----
  // Urinishlar `upsert` qilinmaydi (ularning tabiiy kaliti yo'q), shuning
  // uchun seed qayta ishga tushirilganda avvalgilari o'chiriladi — aks holda
  // har safar yangi to'plam qo'shilib, demo o'quvchida o'nlab urinish
  // to'planib qolardi va statistikani tekshirib bo'lmasdi.
  const seedStudentIds = students.map((s) => s.id);
  await prisma.attemptAnswer.deleteMany({
    where: { attempt: { studentId: { in: seedStudentIds } } },
  });
  await prisma.attempt.deleteMany({ where: { studentId: { in: seedStudentIds } } });

  // Har bir o'quvchining har mavzudagi "ko'nikma darajasi" (0..1) seed'dan
  // hosil qilinadi, shu asosda javoblar to'g'ri/xato bo'ladi — natijada
  // real ma'lumotga o'xshash, lekin har doim bir xil chiqadigan taqsimot olinadi.
  for (const student of students) {
    const skillRand = seedRandom(`skill-${student.email}`);
    const topicSkill = new Map<string, number>();
    for (const { topic } of topics) {
      topicSkill.set(topic.id, 0.4 + skillRand() * 0.55);
    }

    // Uchta urinish: ikkita imtihon va bitta mashq. Imtihon ko'proq, chunki
    // barcha o'rtacha/tayyorgarlik ko'rsatkichlari FAQAT imtihondan
    // hisoblanadi — bitta imtihon bilan panellarda ko'rsatadigan narsa
    // qolmaydi.
    const ATTEMPT_PLAN = [
      { mode: "EXAM" as const, questionCount: 20, daysAgo: 12, unanswered: 0 },
      // Ikkinchi imtihonda oxirgi 3 savol ATAYLAB javobsiz qoldiriladi —
      // "javobsiz" holati (ball xato deb sanaydi, mavzu statistikasi ham
      // shunday) demo bazada ko'rinib tursin.
      { mode: "EXAM" as const, questionCount: 20, daysAgo: 3, unanswered: 3 },
      { mode: "PRACTICE" as const, questionCount: 10, daysAgo: 1, unanswered: 0 },
    ];

    for (let a = 0; a < ATTEMPT_PLAN.length; a++) {
      const plan = ATTEMPT_PLAN[a];
      const startedAt = new Date(Date.now() - plan.daysAgo * 86400000);
      const finishedAt = new Date(startedAt.getTime() + 12 * 60000);

      // Savollar urinish uchun ALOHIDA tanlanadi va `questionIds` ga
      // yoziladi. Ilgari seed butun savollar bazasiga javob berib chiqar va
      // `questionIds` ni umuman to'ldirmas edi — bu ikki jihatdan noto'g'ri:
      //  - haqiqiy urinishda 10/20 savol bo'ladi, 66 ta emas;
      //  - `questionIds` bo'sh bo'lsa mavzu statistikasi (u aynan shu
      //    ro'yxatdan boshlanadi, javobsizni ham sanash uchun) urinishni
      //    umuman ko'rmaydi va panellar bo'sh chiqadi.
      const pickRand = seedRandom(`pick-${student.email}-${a}`);
      const pool = [...allQuestions];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(pickRand() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const picked = pool.slice(0, Math.min(plan.questionCount, pool.length));

      const attempt = await prisma.attempt.create({
        data: {
          studentId: student.id,
          startedAt,
          finishedAt,
          score: 0,
          mode: plan.mode,
          // Guruh urinish topshirilgan paytdagi guruh bo'yicha yoziladi —
          // ustoz/direktor statistikasi aynan shu maydon orqali bog'lanadi.
          groupId: group.id,
          questionIds: picked.map((q) => q.id),
        },
      });

      const answerRand = seedRandom(`answers-${student.email}-${a}`);
      const answeredCount = Math.max(0, picked.length - plan.unanswered);
      let correctCount = 0;

      for (let qi = 0; qi < answeredCount; qi++) {
        const question = picked[qi];
        const skill = topicSkill.get(question.topicId) ?? 0.5;
        const isCorrect = answerRand() < skill;
        if (isCorrect) correctCount++;

        // Xato variant savolning O'Z variantlar soniga qarab tanlanadi.
        // Ilgari bu `% 4` edi — 2 variantli savolga mavjud bo'lmagan
        // 2-indeksni yozib qo'yardi (savollarda endi 2 tadan 5 tagacha
        // variant bo'lishi mumkin).
        const optionCount = Array.isArray(question.options)
          ? question.options.length
          : 4;
        const wrongIndex = (question.correctOptionIndex + 1) % optionCount;

        await prisma.attemptAnswer.create({
          data: {
            attemptId: attempt.id,
            questionId: question.id,
            selectedOptionIndex: isCorrect ? question.correctOptionIndex : wrongIndex,
            isCorrect,
            // Javob vaqti urinish OYNASI ichida bo'lishi shart. Ko'rsatilmasa
            // `now()` yoziladi, `startedAt` esa kunlar oldingi bo'ladi — va
            // imtihon ballini hisoblashda "muddatdan keyin kelgan javob"
            // filtri (`scoreAttempt`) ularning HAMMASINI chiqarib tashlardi.
            // Natijada natija sahifasi saqlangan ball (masalan 60%) ustida
            // "0 ta to'g'ri" ko'rsatardi — aynan o'sha filtr oldini olishi
            // kerak bo'lgan zidlik. Har savolga 30 soniya: 20 savol = 10
            // daqiqa, imtihonning 25 daqiqalik oynasiga bemalol sig'adi.
            answeredAt: new Date(startedAt.getTime() + (qi + 1) * 30_000),
          },
        });
      }

      // Ball ilovadagi formulaning AYNI o'zi: javobsiz qolgan savol xato
      // deb sanaladi (`correct / questionIds.length`).
      const score = Math.round((correctCount / picked.length) * 100);
      await prisma.attempt.update({ where: { id: attempt.id }, data: { score } });
    }
  }

  // ——— Dars jadvali ———
  // Namuna sifatida: dushanba, chorshanba va juma 14:00 da, 4 hafta.
  // Bugungi kun ham kirsa, panelda "Bugungi dars" bandi ko'rinadi.
  //
  // Deterministik ID: `seed-lesson-<n>` — qayta seed qilinganda dublikat
  // bo'lmaydi (savollar va mavzular bilan bir xil qoida).
  {
    const UZ_OFFSET_MS = 5 * 60 * 60 * 1000;
    const DAY_MS = 24 * 60 * 60 * 1000;
    const todayStart =
      Math.floor((Date.now() + UZ_OFFSET_MS) / DAY_MS) * DAY_MS - UZ_OFFSET_MS;

    const weekdays = new Set([1, 3, 5]); // Du, Chor, Ju
    let index = 0;

    for (let offset = 0; offset < 28; offset += 1) {
      const dayStart = todayStart + offset * DAY_MS;
      const shifted = new Date(dayStart + UZ_OFFSET_MS);
      const isoWeekday = shifted.getUTCDay() === 0 ? 7 : shifted.getUTCDay();
      if (!weekdays.has(isoWeekday)) continue;

      index += 1;
      const startsAt = new Date(dayStart + 14 * 60 * 60 * 1000);
      // Mavzu navbat bilan aylanadi — jadval bir xil bo'lib qolmasin.
      const topic = topics[index % topics.length]?.topic;

      await prisma.lesson.upsert({
        where: { id: `seed-lesson-${index}` },
        update: { startsAt, topicId: topic?.id ?? null },
        create: {
          id: `seed-lesson-${index}`,
          groupId: group.id,
          createdById: tutor.id,
          startsAt,
          durationMin: 90,
          topicId: topic?.id ?? null,
          note: index % 4 === 0 ? "Amaliyot" : null,
        },
      });
    }
    console.log(`  Dars jadvali: ${index} ta dars (Du/Chor/Ju, 14:00)`);
  }

  console.log("Seed tayyor. Test hisoblari (parol hammasida bir xil):");
  console.log(`  Parol: ${SEED_PASSWORD}`);
  console.log(`  Owner:    ${owner.email}`);
  console.log(`  Director: ${director.email}`);
  console.log(`  Tutor:    ${tutor.email}`);
  console.log(`  Guruh (register uchun): ${group.name}`);
  console.log(`  O'quvchilar: student1@testify.dev ... student8@testify.dev`);
  console.log(`  Mavzular: ${topics.length}, savollar: ${allQuestions.length}`);
}


main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
