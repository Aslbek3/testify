import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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

const TOPIC_DEFS = [
  {
    name: "Yo'l belgilari",
    questions: [
      {
        text: "Doira shaklidagi qizil ramkali \"Kirish taqiqlangan\" belgisi qanday ma'noni bildiradi?",
        options: [
          "Barcha transport vositalariga shu yo'nalishda harakatlanish taqiqlanadi",
          "Faqat yuk mashinalariga taqiqlanadi",
          "Piyodalarga taqiqlanadi",
          "Faqat tunda amal qiladi",
        ],
        correctOptionIndex: 0,
      },
      {
        text: "Uchburchak shaklidagi ogohlantiruvchi belgilar nimani bildiradi?",
        options: [
          "Taqiqlashni",
          "Yo'l sharoiti haqida oldindan ogohlantirishni",
          "Majburiy yo'nalishni",
          "To'xtash joyini",
        ],
        correctOptionIndex: 1,
      },
    ],
  },
  {
    name: "Svetofor va nazoratchi ishoralari",
    questions: [
      {
        text: "Svetoforda sariq chiroq yonganda haydovchi qanday harakat qilishi kerak?",
        options: [
          "Tezlikni oshiradi",
          "To'xtashga tayyorlanadi",
          "Signal beradi",
          "Chapga buriladi",
        ],
        correctOptionIndex: 1,
      },
      {
        text: "Nazoratchi ishorasi svetofor ko'rsatkichiga zid bo'lsa, haydovchi kimga bo'ysunadi?",
        options: ["Svetoforga", "Nazoratchiga", "Yo'l belgisiga", "O'zi hal qiladi"],
        correctOptionIndex: 1,
      },
    ],
  },
  {
    name: "Ustunlik huquqi",
    questions: [
      {
        text: "Tenglashtirilgan yo'llar chorrahasida chapdan transport kelsa, kim yo'l beradi?",
        options: [
          "Chapdan kelayotgan",
          "O'ngdan kelayotgan",
          "Kim tezroq bo'lsa",
          "Katta mashina",
        ],
        correctOptionIndex: 0,
      },
      {
        text: "Aylanma harakatga kirayotgan haydovchi kimga yo'l berishi shart?",
        options: [
          "Aylanmaga kirayotganlarga",
          "Aylanma ichidagilarga",
          "Piyodalarga",
          "Hech kimga",
        ],
        correctOptionIndex: 1,
      },
    ],
  },
  {
    name: "Tezlik rejimi",
    questions: [
      {
        text: "Aholi punktida, boshqacha belgi bo'lmasa, ruxsat etilgan eng yuqori tezlik?",
        options: ["40 km/soat", "60 km/soat", "80 km/soat", "90 km/soat"],
        correctOptionIndex: 1,
      },
      {
        text: "Yomon ob-havoda haydovchi tezlik va masofani qanday tanlashi kerak?",
        options: [
          "Har doimgidek",
          "Faqat belgiga qarab",
          "Ko'rinish va yo'l holatiga mos kamaytirib",
          "Iloji boricha tez",
        ],
        correctOptionIndex: 2,
      },
    ],
  },
  {
    name: "To'xtash va turish qoidalari",
    questions: [
      {
        text: "Piyodalar o'tish joyidan necha metr masofada to'xtash taqiqlanadi?",
        options: ["1 metr", "5 metr", "15 metr", "to'xtash joyi yo'q"],
        correctOptionIndex: 1,
      },
      {
        text: "Ikki qatorli sariq chiziq bilan belgilangan joyda to'xtash mumkinmi?",
        options: ["Ha, doim", "Yo'q", "Faqat 5 daqiqagacha", "Faqat kechqurun"],
        correctOptionIndex: 1,
      },
    ],
  },
  {
    name: "YTH va javobgarlik",
    questions: [
      {
        text: "YTH sodir bo'lgach, haydovchi eng avval nima qilishi shart?",
        options: [
          "Darhol joyni tark etadi",
          "Transportni to'xtatib, xavfsizlik choralarini ko'radi",
          "Guvohlarni tarqatib yuboradi",
          "Boshqa haydovchini ayblaydi",
        ],
        correctOptionIndex: 1,
      },
      {
        text: "Yengil YTHda ikkala tomon rozi bo'lsa, GAIsiz hujjatlashtirish mumkinmi?",
        options: [
          "Yo'q, hech qachon",
          "Ha, qonunda belgilangan tartibda mumkin",
          "Faqat kechasi",
          "Faqat bir tomon aybdor bo'lsa",
        ],
        correctOptionIndex: 1,
      },
    ],
  },
  {
    name: "Texnik holat",
    questions: [
      {
        text: "Tormoz tizimi nosoz transport vositasini haydash mumkinmi?",
        options: ["Ha", "Yo'q", "Faqat shahar ichida", "Faqat kunduzi"],
        correctOptionIndex: 1,
      },
      {
        text: "Old oyna darzli bo'lsa, transport vositasidan foydalanish mumkinmi?",
        options: [
          "Ha, cheklovsiz",
          "Ko'rinishni xalaqit bersa taqiqlanadi",
          "Faqat tungi vaqtda",
          "Faqat shahar tashqarisida",
        ],
        correctOptionIndex: 1,
      },
    ],
  },
  {
    name: "Piyodalar xavfsizligi",
    questions: [
      {
        text: "Piyodalar o'tish joyida to'xtagan piyoda oldida haydovchi qanday harakat qiladi?",
        options: [
          "Signal berib o'tadi",
          "Piyoda o'tib bo'lguncha kutadi",
          "Tezlikni oshiradi",
          "Chap tomondan aylanib o'tadi",
        ],
        correctOptionIndex: 1,
      },
      {
        text: "Maktab oldidagi hududda haydovchi qanday ehtiyot chorasini ko'radi?",
        options: [
          "Hech qanday maxsus chora kerak emas",
          "Tezlikni kamaytirib, alohida diqqat bilan harakatlanadi",
          "Signal berib o'tishni tezlashtiradi",
          "Faqat kechqurun ehtiyot bo'ladi",
        ],
        correctOptionIndex: 1,
      },
    ],
  },
];

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
      update: {},
      create: { id: `seed-topic-${slugify(t.name)}`, name: t.name },
    });
    const questions = [];
    for (let i = 0; i < t.questions.length; i++) {
      const q = t.questions[i];
      const question = await prisma.question.upsert({
        where: { id: `${topic.id}-q${i}` },
        update: {},
        create: {
          id: `${topic.id}-q${i}`,
          topicId: topic.id,
          text: q.text,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
        },
      });
      questions.push(question);
    }
    topics.push({ topic, questions });
  }
  const allQuestions = topics.flatMap((t) => t.questions);

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
  // Har bir o'quvchining har mavzudagi "ko'nikma darajasi" (0..1) seed'dan
  // hosil qilinadi, shu asosda javoblar to'g'ri/xato bo'ladi — natijada
  // real ma'lumotga o'xshash, lekin har doim bir xil chiqadigan taqsimot olinadi.
  for (const student of students) {
    const skillRand = seedRandom(`skill-${student.email}`);
    const topicSkill = new Map<string, number>();
    for (const { topic } of topics) {
      topicSkill.set(topic.id, 0.4 + skillRand() * 0.55);
    }

    const attemptCount = 2;
    for (let a = 0; a < attemptCount; a++) {
      const daysAgo = a === 0 ? 10 : 2;
      const startedAt = new Date(Date.now() - daysAgo * 86400000);
      const finishedAt = new Date(startedAt.getTime() + 12 * 60000);

      const attempt = await prisma.attempt.create({
        data: {
          studentId: student.id,
          startedAt,
          finishedAt,
          score: 0,
        },
      });

      const answerRand = seedRandom(`answers-${student.email}-${a}`);
      let correctCount = 0;
      for (const { topic, questions } of topics) {
        const skill = topicSkill.get(topic.id)!;
        for (const question of questions) {
          const isCorrect = answerRand() < skill;
          if (isCorrect) correctCount++;
          const wrongIndex = (question.correctOptionIndex + 1) % 4;
          await prisma.attemptAnswer.create({
            data: {
              attemptId: attempt.id,
              questionId: question.id,
              selectedOptionIndex: isCorrect
                ? question.correctOptionIndex
                : wrongIndex,
              isCorrect,
            },
          });
        }
      }

      const score = Math.round((correctCount / allQuestions.length) * 100);
      await prisma.attempt.update({ where: { id: attempt.id }, data: { score } });
    }
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

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['".]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
