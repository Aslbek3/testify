import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import {
  reportQuestion,
  listOpenReports,
  countOpenReports,
  resolveReport,
  QuestionReportError,
  REPORT_REASON_MAX_LENGTH,
} from "@/services/questionReports";
import {
  createFixture,
  createQuestions,
  createUnit,
  cleanupFixture,
  disconnect,
  type Fixture,
} from "./fixture";

/**
 * Savolga shikoyat.
 *
 * Eng qimmat tekshiruv — TAKRORIY shikoyat. Servis `@@unique([questionId,
 * reportedById])` cheklovining P2002 xatosini ATAYLAB yutadi: tugma ikki
 * marta bosilishi mumkin va bu foydalanuvchiga xato bo'lib ko'rinmasligi
 * kerak. Bu xatti-harakat faqat haqiqiy bazada tekshiriladi — xotirada
 * P2002 hech qachon chiqmaydi, ya'ni `catch` bloki hech qachon
 * sinovdan o'tmagan bo'lib qolardi.
 *
 * Umumiy sonlar (`countOpenReports`) ATAYLAB o'z savollarimiz bo'yicha
 * qayta hisoblanadi: bazada boshqa (seed yoki qo'lda yaratilgan)
 * shikoyatlar bo'lishi mumkin va global songa bog'lanish testni
 * bazaning tasodifiy holatiga bog'lab qo'yardi.
 */

let fixture: Fixture;
let questionIds: string[];

before(async () => {
  fixture = await createFixture("question-reports");
  questionIds = await createQuestions(fixture, 2);
});

after(async () => {
  await cleanupFixture(fixture);
  await disconnect();
});

beforeEach(async () => {
  await prisma.questionReport.deleteMany({ where: { questionId: { in: questionIds } } });
});

function ownReports(status: "OPEN" | "RESOLVED" | "DISMISSED" = "OPEN") {
  return prisma.questionReport.count({ where: { questionId: { in: questionIds }, status } });
}

describe("reportQuestion", () => {
  test("takroriy shikoyat xato bermaydi va DUBLIKAT yaratmaydi", async () => {
    await reportQuestion({
      questionId: questionIds[0],
      reportedById: fixture.student.id,
      reason: "javob noto'g'ri",
    });
    // Ikkinchi marta — tugma qayta bosilgan holat.
    await reportQuestion({
      questionId: questionIds[0],
      reportedById: fixture.student.id,
      reason: "boshqa izoh",
    });

    const rows = await prisma.questionReport.findMany({
      where: { questionId: questionIds[0], reportedById: fixture.student.id },
      select: { reason: true },
    });
    assert.equal(rows.length, 1);
    // Birinchi izoh qoladi — ikkinchisi ustiga yozilmaydi.
    assert.equal(rows[0].reason, "javob noto'g'ri");
  });

  test("ikki xil odam ayni savolga shikoyat qila oladi", async () => {
    const other = await createUnit(fixture, "ikkinchi-shikoyatchi");
    await reportQuestion({ questionId: questionIds[0], reportedById: fixture.student.id });
    await reportQuestion({ questionId: questionIds[0], reportedById: other.student.id });
    assert.equal(await ownReports(), 2);
  });

  test("izoh bo'sh bo'lsa null yoziladi — bo'sh satr saqlanmaydi", async () => {
    await reportQuestion({
      questionId: questionIds[0],
      reportedById: fixture.student.id,
      reason: "   ",
    });
    const row = await prisma.questionReport.findFirstOrThrow({
      where: { questionId: questionIds[0] },
      select: { reason: true },
    });
    assert.equal(row.reason, null);
  });

  test("uzun izoh chegaraga qirqiladi", async () => {
    await reportQuestion({
      questionId: questionIds[0],
      reportedById: fixture.student.id,
      reason: "x".repeat(REPORT_REASON_MAX_LENGTH + 50),
    });
    const row = await prisma.questionReport.findFirstOrThrow({
      where: { questionId: questionIds[0] },
      select: { reason: true },
    });
    assert.equal(row.reason?.length, REPORT_REASON_MAX_LENGTH);
  });

  test("yo'q savolga 404", async () => {
    await assert.rejects(
      () => reportQuestion({ questionId: "yoq-savol-id", reportedById: fixture.student.id }),
      (error: unknown) => error instanceof QuestionReportError && error.status === 404
    );
  });
});

describe("Ko'rib chiqish", () => {
  test("ochiq shikoyat ro'yxatda savol va mavzu nomi bilan chiqadi", async () => {
    await reportQuestion({
      questionId: questionIds[1],
      reportedById: fixture.student.id,
      reason: "ikki ma'noli",
    });

    const mine = (await listOpenReports()).filter((r) => r.questionId === questionIds[1]);
    assert.equal(mine.length, 1);
    assert.equal(mine[0].topicName, fixture.topic.name);
    assert.equal(mine[0].topicId, fixture.topic.id);
    assert.equal(mine[0].reporterName, fixture.student.name);
    assert.equal(mine[0].reason, "ikki ma'noli");
  });

  test("yopilgan shikoyat ro'yxatdan va sanoqdan chiqadi", async () => {
    await reportQuestion({ questionId: questionIds[0], reportedById: fixture.student.id });
    const report = await prisma.questionReport.findFirstOrThrow({
      where: { questionId: questionIds[0] },
      select: { id: true },
    });

    const openBefore = await countOpenReports();
    await resolveReport({ reportId: report.id, status: "RESOLVED" });

    assert.equal(await ownReports("OPEN"), 0);
    assert.equal(await ownReports("RESOLVED"), 1);
    assert.equal(await countOpenReports(), openBefore - 1);

    const row = await prisma.questionReport.findUniqueOrThrow({
      where: { id: report.id },
      select: { resolvedAt: true },
    });
    assert.ok(row.resolvedAt, "yopilgan payt yozilishi kerak");
  });

  test("allaqachon yopilgan shikoyatni ikkinchi marta yopib bo'lmaydi", async () => {
    await reportQuestion({ questionId: questionIds[0], reportedById: fixture.student.id });
    const report = await prisma.questionReport.findFirstOrThrow({
      where: { questionId: questionIds[0] },
      select: { id: true },
    });
    await resolveReport({ reportId: report.id, status: "DISMISSED" });

    // Nega muhim: owner ro'yxatni ikki yorliqda ochib, ikki marta
    // bosishi mumkin — ikkinchi bosish holatni qayta yozmasligi kerak.
    await assert.rejects(
      () => resolveReport({ reportId: report.id, status: "RESOLVED" }),
      (error: unknown) => error instanceof QuestionReportError && error.status === 404
    );
    const row = await prisma.questionReport.findUniqueOrThrow({
      where: { id: report.id },
      select: { status: true },
    });
    assert.equal(row.status, "DISMISSED");
  });
});
