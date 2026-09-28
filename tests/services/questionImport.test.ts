import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { MAX_IMPORT_QUESTIONS } from "@/lib/questionImport";
import { MIN_OPTIONS, MAX_OPTIONS } from "@/lib/questionOptions";
import {
  importQuestions,
  QuestionImportError,
  type ImportedQuestion,
} from "@/services/questionImport";
import { createFixture, cleanupFixture, disconnect, type Fixture } from "./fixture";

/**
 * Savollarni ommaviy import qilish — savollar bazasini to'ldirishning
 * yagona real yo'li, ya'ni mahsulotning eng katta to'sig'i ustidagi kod.
 *
 * Uchta qoida tekshiriladi (servis izohidagi ro'yxat bilan bir xil
 * tartibda): bitta xato bo'lsa hech narsa yozilmaydi; takror savol
 * o'tkazib yuboriladi; mavzu yo'q bo'lsa yaratiladi — va bitta importda
 * "Tezlik" bilan "tezlik" BITTA mavzu bo'ladi.
 *
 * Oxirgisi aynan bazali test talab qiladi: mavjud mavzular bilan
 * solishtirish `mode: "insensitive"` so'rovi orqali, ya'ni uni Postgres
 * bajaradi, JavaScript emas.
 */

let fixture: Fixture;

before(async () => {
  fixture = await createFixture("question-import");
});

after(async () => {
  await cleanupFixture(fixture);
  await disconnect();
});

// Har testdan oldin fixture mavzusidagi savollar va import yaratgan
// mavzular olib tashlanadi, shunda har test toza boshlanadi.
beforeEach(async () => {
  const topics = await prisma.topic.findMany({
    where: { name: { contains: fixture.suffix } },
    select: { id: true },
  });
  const ids = topics.map((t) => t.id);
  await prisma.question.deleteMany({ where: { topicId: { in: ids } } });
  await prisma.topic.deleteMany({
    where: { id: { in: ids }, NOT: { id: fixture.topic.id } },
  });
});

/** Yaroqli qator — testlar undan kerakli maydonni almashtirib ishlatadi. */
function row(overrides: Partial<ImportedQuestion> & { topic?: string } = {}) {
  return {
    topic: fixture.topic.name,
    text: `Import savoli ${Math.random().toString(36).slice(2, 10)} (${fixture.suffix})`,
    options: ["A", "B", "C"],
    correctOptionIndex: 1,
    ...overrides,
  };
}

function countQuestionsInOwnTopics() {
  return prisma.question.count({
    where: { topic: { name: { contains: fixture.suffix } } },
  });
}

describe("Mavzular", () => {
  test("bitta importda \"Tezlik\" va \"tezlik\" BITTA mavzu yaratadi", async () => {
    // Suffiks nom ichida: tozalash shu bo'yicha topadi va boshqa
    // testlarning mavzulari bilan to'qnashmaydi.
    const upper = `Tezlik ${fixture.suffix}`;
    const lower = `tezlik ${fixture.suffix}`;

    const result = await importQuestions([
      row({ topic: upper }),
      row({ topic: lower }),
    ]);

    assert.deepEqual(result.errors, []);
    assert.equal(result.created, 2);
    assert.deepEqual(result.createdTopics, [upper], "faqat birinchi yozuv yaratiladi");

    const topics = await prisma.topic.findMany({
      where: { name: { in: [upper, lower], mode: "insensitive" } },
      select: { id: true, name: true },
    });
    assert.equal(topics.length, 1, `mavzular: ${topics.map((t) => t.name).join(", ")}`);
    // Ikkinchi qatorning savoli ham AYNI mavzuga yozilgan.
    assert.equal(await prisma.question.count({ where: { topicId: topics[0].id } }), 2);
  });

  test("mavjud mavzu katta/kichik harf farqi bilan yozilsa yangisi yaratilmaydi", async () => {
    const result = await importQuestions([
      row({ topic: fixture.topic.name.toUpperCase() }),
    ]);

    assert.deepEqual(result.createdTopics, []);
    assert.equal(result.created, 1);
    assert.equal(
      await prisma.question.count({ where: { topicId: fixture.topic.id } }),
      1,
      "savol mavjud mavzuga yozilishi kerak"
    );
  });

  test("yangi mavzu hisobotda aytiladi — imlo xatosi jimgina o'tmaydi", async () => {
    const typo = `Yol belgilri ${fixture.suffix}`;
    const result = await importQuestions([row({ topic: typo })]);
    assert.deepEqual(result.createdTopics, [typo]);
  });
});

describe("Bitta xato bo'lsa hech narsa yozilmaydi", () => {
  test("yaroqli qatorlar ham yozilmaydi", async () => {
    const result = await importQuestions([
      row(),
      row({ options: ["A"] }),
      row(),
    ]);

    assert.equal(result.created, 0);
    assert.equal(result.skipped, 0);
    assert.deepEqual(result.createdTopics, []);
    assert.equal(result.errors.length, 1);
    // Qator raqami 1 dan boshlanadi — foydalanuvchi faylda o'sha qatorni
    // topishi kerak.
    assert.equal(result.errors[0].row, 2);
    assert.equal(await countQuestionsInOwnTopics(), 0);
  });

  test("xato bo'lganda yangi mavzu ham yaratilmaydi", async () => {
    const newTopic = `Yangi mavzu ${fixture.suffix}`;
    const result = await importQuestions([row({ topic: newTopic }), row({ text: "" })]);
    assert.equal(result.errors.length, 1);
    assert.equal(
      await prisma.topic.count({ where: { name: newTopic } }),
      0,
      "xatoli importda mavzu yaratilmasligi kerak"
    );
  });

  test("har bir noto'g'ri maydon o'z xatosini beradi", async () => {
    const cases: { label: string; raw: unknown; expect: RegExp }[] = [
      { label: "obyekt emas", raw: "matn", expect: /obyekt emas/ },
      { label: "mavzu yo'q", raw: row({ topic: "" }), expect: /Mavzu nomi/ },
      { label: "matn yo'q", raw: row({ text: "   " }), expect: /Savol matni/ },
      {
        label: "variant kam",
        raw: row({ options: ["A"] }),
        expect: new RegExp(`${MIN_OPTIONS} tadan ${MAX_OPTIONS} tagacha`),
      },
      {
        label: "variant ko'p",
        raw: row({ options: ["A", "B", "C", "D", "E", "F"] }),
        expect: new RegExp(`${MIN_OPTIONS} tadan ${MAX_OPTIONS} tagacha`),
      },
      { label: "bo'sh variant", raw: row({ options: ["A", ""] }), expect: /Bo'sh variant/ },
      {
        label: "to'g'ri javob chegaradan tashqarida",
        raw: row({ correctOptionIndex: 3 }),
        expect: /To'g'ri javob raqami/,
      },
      {
        label: "to'g'ri javob butun son emas",
        raw: row({ correctOptionIndex: 1.5 }),
        expect: /To'g'ri javob raqami/,
      },
      {
        label: "bilet raqami tartibsiz",
        raw: row({ ticketNumber: 3 }),
        expect: /ticketNumber va ticketOrder birga/,
      },
      {
        label: "bilet tartibi raqamsiz",
        raw: row({ ticketOrder: 1 }),
        expect: /ticketNumber va ticketOrder birga/,
      },
      {
        label: "bilet raqami noldan",
        raw: row({ ticketNumber: 0, ticketOrder: 1 }),
        expect: /ticketNumber/,
      },
      {
        label: "bilet tartibi noldan",
        raw: row({ ticketNumber: 1, ticketOrder: 0 }),
        expect: /ticketOrder/,
      },
      {
        label: "tashqi rasm manzili",
        raw: row({ imageUrl: "https://boshqa-sayt.example/rasm.png" }),
        expect: /Rasm manzili/,
      },
      {
        label: "rasm manzilida yuqoriga chiqish",
        raw: row({ imageUrl: "/api/question-images/../../.env" }),
        expect: /Rasm manzili/,
      },
    ];

    for (const testCase of cases) {
      const result = await importQuestions([testCase.raw]);
      assert.equal(result.created, 0, testCase.label);
      assert.equal(result.errors.length, 1, testCase.label);
      assert.match(result.errors[0].message, testCase.expect, testCase.label);
    }
    assert.equal(await countQuestionsInOwnTopics(), 0);
  });
});

describe("Takror savol", () => {
  test("bitta yuborishning O'ZIDA takrorlangan savol o'tkazib yuboriladi", async () => {
    const text = `Ayni savol (${fixture.suffix})`;
    const result = await importQuestions([row({ text }), row({ text })]);
    assert.equal(result.created, 1);
    assert.equal(result.skipped, 1);
  });

  test("ro'yxatni ikki marta yuborish xavfsiz", async () => {
    const items = [row(), row()];
    const first = await importQuestions(items);
    assert.equal(first.created, 2);

    const second = await importQuestions(items);
    assert.equal(second.created, 0);
    assert.equal(second.skipped, 2);
    assert.equal(await countQuestionsInOwnTopics(), 2);
  });

  test("takror faqat AYNI mavzu ichida hisoblanadi", async () => {
    const text = `Bir xil matn, boshqa mavzu (${fixture.suffix})`;
    const result = await importQuestions([
      row({ text }),
      row({ text, topic: `Boshqa mavzu ${fixture.suffix}` }),
    ]);
    assert.equal(result.created, 2);
    assert.equal(result.skipped, 0);
  });
});

describe("Ro'yxatning o'zi", () => {
  test("massiv emas", async () => {
    await assert.rejects(
      () => importQuestions({ topic: "x" }),
      (error: unknown) => error instanceof QuestionImportError && error.status === 400
    );
  });

  test("bo'sh ro'yxat", async () => {
    await assert.rejects(
      () => importQuestions([]),
      (error: unknown) =>
        error instanceof QuestionImportError && /bo'sh/.test(error.message)
    );
  });

  test("chegaradan ko'p savol — bazaga umuman borilmaydi", async () => {
    const tooMany = Array.from({ length: MAX_IMPORT_QUESTIONS + 1 }, () => row());
    await assert.rejects(
      () => importQuestions(tooMany),
      (error: unknown) =>
        error instanceof QuestionImportError &&
        error.message.includes(String(MAX_IMPORT_QUESTIONS))
    );
    assert.equal(await countQuestionsInOwnTopics(), 0);
  });
});

describe("Yozilgan savol", () => {
  test("barcha maydonlar saqlanadi", async () => {
    const text = `To'liq savol (${fixture.suffix})`;
    await importQuestions([
      row({
        text,
        options: ["A", "B", "C", "D"],
        correctOptionIndex: 3,
        explanation: "izoh",
        legalReference: "YHQ 21-bobi",
        imageUrl: "/questions/belgi.svg",
        imageAlt: "belgi",
        ticketNumber: 4,
        ticketOrder: 7,
      }),
    ]);

    const saved = await prisma.question.findFirstOrThrow({
      where: { text },
      select: {
        options: true,
        correctOptionIndex: true,
        explanation: true,
        legalReference: true,
        imageUrl: true,
        imageAlt: true,
        ticketNumber: true,
        ticketOrder: true,
        topicId: true,
      },
    });
    assert.deepEqual(saved.options, ["A", "B", "C", "D"]);
    assert.equal(saved.correctOptionIndex, 3);
    assert.equal(saved.explanation, "izoh");
    assert.equal(saved.legalReference, "YHQ 21-bobi");
    assert.equal(saved.imageUrl, "/questions/belgi.svg");
    assert.equal(saved.imageAlt, "belgi");
    assert.equal(saved.ticketNumber, 4);
    assert.equal(saved.ticketOrder, 7);
    assert.equal(saved.topicId, fixture.topic.id);
  });

  test("ixtiyoriy maydonlar berilmasa null bo'ladi", async () => {
    const text = `Eng oddiy savol (${fixture.suffix})`;
    await importQuestions([row({ text })]);
    const saved = await prisma.question.findFirstOrThrow({
      where: { text },
      select: { explanation: true, imageUrl: true, ticketNumber: true, ticketOrder: true },
    });
    assert.deepEqual(saved, {
      explanation: null,
      imageUrl: null,
      ticketNumber: null,
      ticketOrder: null,
    });
  });
});
