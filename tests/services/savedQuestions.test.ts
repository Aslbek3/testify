import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import {
  toggleSavedQuestion,
  listSavedQuestionIds,
  listSavedQuestions,
  countSavedQuestions,
  SavedQuestionError,
} from "@/services/savedQuestions";
import {
  createFixture,
  createQuestions,
  createUnit,
  cleanupFixture,
  disconnect,
  type Fixture,
} from "./fixture";

/**
 * "Saqlanganlar" (xatcho'p).
 *
 * Nega bazali test kerak: bu servisning butun ma'nosi `@@unique
 * ([studentId, questionId])` cheklovida — bitta tugma ham saqlaydi, ham
 * bekor qiladi. Xotiradagi ob'ekt bilan tekshirilsa, aynan o'sha cheklov
 * (ya'ni tekshirilishi kerak bo'lgan yagona narsa) sinovdan tashqarida
 * qolardi.
 */

let fixture: Fixture;
let questionIds: string[];

before(async () => {
  fixture = await createFixture("saved-questions");
  questionIds = await createQuestions(fixture, 3);
});

after(async () => {
  await cleanupFixture(fixture);
  await disconnect();
});

beforeEach(async () => {
  await prisma.savedQuestion.deleteMany({ where: { studentId: fixture.student.id } });
});

describe("toggleSavedQuestion", () => {
  test("birinchi bosish saqlaydi, ikkinchisi bekor qiladi", async () => {
    const first = await toggleSavedQuestion({
      studentId: fixture.student.id,
      questionId: questionIds[0],
    });
    assert.deepEqual(first, { saved: true });
    assert.equal(await countSavedQuestions(fixture.student.id), 1);

    const second = await toggleSavedQuestion({
      studentId: fixture.student.id,
      questionId: questionIds[0],
    });
    assert.deepEqual(second, { saved: false });
    assert.equal(await countSavedQuestions(fixture.student.id), 0);

    // Uchinchi bosish yana saqlaydi — holat almashib turadi, to'planmaydi.
    const third = await toggleSavedQuestion({
      studentId: fixture.student.id,
      questionId: questionIds[0],
    });
    assert.deepEqual(third, { saved: true });
    assert.equal(
      await prisma.savedQuestion.count({
        where: { studentId: fixture.student.id, questionId: questionIds[0] },
      }),
      1,
      "bir savol uchun bir yozuvdan ko'p bo'lmasligi kerak"
    );
  });

  test("yo'q savolga 404", async () => {
    await assert.rejects(
      () =>
        toggleSavedQuestion({
          studentId: fixture.student.id,
          questionId: "yoq-savol-id",
        }),
      (error: unknown) => error instanceof SavedQuestionError && error.status === 404
    );
  });

  test("boshqa o'quvchining xatcho'piga tegmaydi", async () => {
    // Servis `studentId` ni chaqiruvchidan oladi, ya'ni ikki o'quvchining
    // ayni savolga qo'ygan xatcho'pi bir-biridan mustaqil bo'lishi kerak.
    const other = await createUnit(fixture, "boshqa-oquvchi");
    await toggleSavedQuestion({
      studentId: fixture.student.id,
      questionId: questionIds[0],
    });
    await toggleSavedQuestion({
      studentId: other.student.id,
      questionId: questionIds[0],
    });

    const off = await toggleSavedQuestion({
      studentId: fixture.student.id,
      questionId: questionIds[0],
    });
    assert.deepEqual(off, { saved: false });
    assert.equal(await countSavedQuestions(other.student.id), 1);

    await prisma.savedQuestion.deleteMany({ where: { studentId: other.student.id } });
  });
});

describe("Ro'yxatlar", () => {
  test("listSavedQuestionIds faqat so'ralgan savollar orasidan qaytaradi", async () => {
    await toggleSavedQuestion({
      studentId: fixture.student.id,
      questionId: questionIds[0],
    });
    await toggleSavedQuestion({
      studentId: fixture.student.id,
      questionId: questionIds[2],
    });

    const found = await listSavedQuestionIds(fixture.student.id, questionIds.slice(0, 2));
    assert.deepEqual([...found], [questionIds[0]]);

    // Bo'sh ro'yxat — bazaga bormaydi, bo'sh Set qaytadi.
    assert.equal((await listSavedQuestionIds(fixture.student.id, [])).size, 0);
  });

  test("listSavedQuestions eng yangisini birinchi beradi va savol matnini qo'shadi", async () => {
    await toggleSavedQuestion({
      studentId: fixture.student.id,
      questionId: questionIds[0],
    });
    // `createdAt` bir xil millisekundga tushib qolmasin — tartib shu
    // maydon bo'yicha.
    await new Promise((resolve) => setTimeout(resolve, 20));
    await toggleSavedQuestion({
      studentId: fixture.student.id,
      questionId: questionIds[1],
    });

    const rows = await listSavedQuestions(fixture.student.id);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].questionId, questionIds[1]);
    assert.equal(rows[0].topicName, fixture.topic.name);
    assert.deepEqual(rows[0].options, ["A", "B", "C"]);
    assert.equal(rows[0].correctOptionIndex, 0);
  });
});
