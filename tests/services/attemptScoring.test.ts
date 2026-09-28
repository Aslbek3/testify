import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AttemptMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { EXAM_DURATION_SECONDS } from "@/lib/examRules";
import { NO_ORGANIZATION_SWITCHES } from "@/types/auth";
import type { SessionUser } from "@/types/auth";
import { AttemptError } from "@/services/attemptError";
import {
  closeAttemptNow,
  finalizeExpiredAttemptsIn,
  finishAttempt,
} from "@/services/attemptScoring";
import {
  createFixture,
  createQuestions,
  createUnit,
  cleanupFixture,
  disconnect,
  type Fixture,
} from "./fixture";

/**
 * Tashlab ketilgan imtihonlarni yopish — bazaga boradigan eng nozik
 * servis.
 *
 * Nega aynan shu birinchi navbatda qoplanadi: u o'quvchining BAHOSINI
 * yozadi va "yalqov" ishlaydi (cron yo'q — faqat kimdir sahifa
 * ochganda). Xatosi jimgina bo'ladi: urinish statistikaga noto'g'ri ball
 * bilan tushadi yoki umuman tushmaydi, va buni hech kim darhol
 * sezmaydi. `computeScore` ning o'zi sof funksiya va `tests/
 * attemptScoring.test.ts` da bazasiz tekshirilgan — bu yerda esa
 * QAMROVLAR (kim chaqirsa nima yopiladi) va bazaga yozilgan qiymat.
 */

const MS = 1000;
let fixture: Fixture;
let questionIds: string[];

before(async () => {
  fixture = await createFixture("attempt-scoring");
  questionIds = await createQuestions(fixture, 4);
});

after(async () => {
  await cleanupFixture(fixture);
  await disconnect();
});

/** Muddati o'tgan (ya'ni yopilishi kerak) imtihon uchun boshlanish vaqti. */
function expiredStart(extraSeconds = 60): Date {
  return new Date(Date.now() - (EXAM_DURATION_SECONDS + extraSeconds) * MS);
}

async function createAttempt(input: {
  studentId: string;
  groupId: string;
  startedAt: Date;
  mode?: AttemptMode;
  questionIds?: string[];
  finishedAt?: Date;
  score?: number;
}): Promise<string> {
  const attempt = await prisma.attempt.create({
    data: {
      studentId: input.studentId,
      groupId: input.groupId,
      mode: input.mode ?? "EXAM",
      startedAt: input.startedAt,
      questionIds: input.questionIds ?? questionIds,
      finishedAt: input.finishedAt ?? null,
      score: input.score ?? null,
    },
    select: { id: true },
  });
  return attempt.id;
}

async function answer(
  attemptId: string,
  questionId: string,
  isCorrect: boolean,
  answeredAt: Date
) {
  await prisma.attemptAnswer.create({
    data: { attemptId, questionId, selectedOptionIndex: 0, isCorrect, answeredAt },
  });
}

/**
 * ⚠️ Bu describe ATAYLAB birinchi turadi: `organizationId` qamrovi butun
 * tashkilotni supuradi, ya'ni undan keyin boshqa testlarning ochiq
 * urinishlari qolmasligi kerak edi. Boshqa yo'l — har bir qamrov uchun
 * alohida tashkilot yaratish, lekin bu bir nechta ortiqcha yozuv degani.
 */
describe("Qamrovlar — kim chaqirsa nima yopiladi", () => {
  test("organizationId — butun tashkilot bo'yicha (direktor paneli)", async () => {
    const unit = await createUnit(fixture, "org");
    await createAttempt({
      studentId: unit.student.id,
      groupId: unit.group.id,
      startedAt: expiredStart(),
    });

    const closed = await finalizeExpiredAttemptsIn({
      organizationId: fixture.organization.id,
    });
    assert.equal(closed, 1);
  });

  test("studentId — o'quvchining o'z sahifalari", async () => {
    const unit = await createUnit(fixture, "student");
    await createAttempt({
      studentId: unit.student.id,
      groupId: unit.group.id,
      startedAt: expiredStart(),
    });
    await createAttempt({
      studentId: unit.student.id,
      groupId: unit.group.id,
      startedAt: expiredStart(3600),
    });

    assert.equal(await finalizeExpiredAttemptsIn({ studentId: unit.student.id }), 2);
  });

  test("groupId — guruh sahifasi", async () => {
    const unit = await createUnit(fixture, "group");
    await createAttempt({
      studentId: unit.student.id,
      groupId: unit.group.id,
      startedAt: expiredStart(),
    });

    assert.equal(await finalizeExpiredAttemptsIn({ groupId: unit.group.id }), 1);
  });

  test("tutorId — ustozning barcha guruhlari", async () => {
    const unit = await createUnit(fixture, "tutor");
    await createAttempt({
      studentId: unit.student.id,
      groupId: unit.group.id,
      startedAt: expiredStart(),
    });

    assert.equal(await finalizeExpiredAttemptsIn({ tutorId: unit.tutor.id }), 1);
  });

  test("guruh qamrovi BEGONA guruhning urinishiga tegmaydi", async () => {
    const mine = await createUnit(fixture, "chegara-a");
    const other = await createUnit(fixture, "chegara-b");
    const mineAttempt = await createAttempt({
      studentId: mine.student.id,
      groupId: mine.group.id,
      startedAt: expiredStart(),
    });
    const otherAttempt = await createAttempt({
      studentId: other.student.id,
      groupId: other.group.id,
      startedAt: expiredStart(),
    });

    assert.equal(await finalizeExpiredAttemptsIn({ groupId: mine.group.id }), 1);

    const rows = await prisma.attempt.findMany({
      where: { id: { in: [mineAttempt, otherAttempt] } },
      select: { id: true, finishedAt: true },
    });
    const byId = new Map(rows.map((r) => [r.id, r.finishedAt]));
    assert.ok(byId.get(mineAttempt) !== null, "o'z guruhining urinishi yopilishi kerak");
    assert.equal(byId.get(otherAttempt), null, "begona guruhning urinishi ochiq qolishi kerak");

    // Ochiq qolgani keyingi testlarga xalaqit bermasin.
    await finalizeExpiredAttemptsIn({ groupId: other.group.id });
  });
});

describe("Qaysi urinish yopilmaydi", () => {
  test("mashq (PRACTICE) — unda taymer yo'q", async () => {
    const unit = await createUnit(fixture, "mashq");
    const id = await createAttempt({
      studentId: unit.student.id,
      groupId: unit.group.id,
      startedAt: expiredStart(),
      mode: "PRACTICE",
    });

    assert.equal(await finalizeExpiredAttemptsIn({ studentId: unit.student.id }), 0);
    const row = await prisma.attempt.findUniqueOrThrow({
      where: { id },
      select: { finishedAt: true },
    });
    assert.equal(row.finishedAt, null);
  });

  test("muddati hali o'tmagan imtihon — o'quvchi yechib o'tiribdi", async () => {
    const unit = await createUnit(fixture, "davom");
    await createAttempt({
      studentId: unit.student.id,
      groupId: unit.group.id,
      startedAt: new Date(Date.now() - 60 * MS),
    });

    assert.equal(await finalizeExpiredAttemptsIn({ studentId: unit.student.id }), 0);
  });

  test("allaqachon yakunlangan urinishning bali qayta yozilmaydi", async () => {
    const unit = await createUnit(fixture, "yakunlangan");
    const finishedAt = new Date(Date.now() - 10 * 60 * MS);
    const id = await createAttempt({
      studentId: unit.student.id,
      groupId: unit.group.id,
      startedAt: expiredStart(),
      finishedAt,
      score: 95,
    });

    assert.equal(await finalizeExpiredAttemptsIn({ studentId: unit.student.id }), 0);
    const row = await prisma.attempt.findUniqueOrThrow({
      where: { id },
      select: { score: true, finishedAt: true },
    });
    assert.equal(row.score, 95);
    assert.equal(row.finishedAt?.getTime(), finishedAt.getTime());
  });

  test("yopiladigan urinish bo'lmasa 0 qaytadi va bazaga bormaydi", async () => {
    const unit = await createUnit(fixture, "bosh");
    assert.equal(await finalizeExpiredAttemptsIn({ studentId: unit.student.id }), 0);
  });
});

describe("Yopilgan urinishning bali va vaqti", () => {
  test("ball qisman javoblardan hisoblanadi (javobsizlari xato sanaladi)", async () => {
    const unit = await createUnit(fixture, "ball");
    const startedAt = expiredStart();
    const id = await createAttempt({
      studentId: unit.student.id,
      groupId: unit.group.id,
      startedAt,
    });
    await answer(id, questionIds[0], true, new Date(startedAt.getTime() + 10 * MS));
    await answer(id, questionIds[1], false, new Date(startedAt.getTime() + 20 * MS));

    await finalizeExpiredAttemptsIn({ studentId: unit.student.id });

    const row = await prisma.attempt.findUniqueOrThrow({
      where: { id },
      select: { score: true },
    });
    // 4 ta savoldan 1 tasi to'g'ri → 25%.
    assert.equal(row.score, 25);
  });

  test("yakunlanish vaqti — muddat tugagan lahza, hozirgi vaqt EMAS", async () => {
    const unit = await createUnit(fixture, "vaqt");
    // Uch soat oldin boshlangan: agar "hozir" yozilsa, 25 daqiqalik
    // imtihon uch soat davom etgandek ko'rinardi.
    const startedAt = new Date(Date.now() - 3 * 60 * 60 * MS);
    const id = await createAttempt({
      studentId: unit.student.id,
      groupId: unit.group.id,
      startedAt,
    });

    await finalizeExpiredAttemptsIn({ studentId: unit.student.id });

    const row = await prisma.attempt.findUniqueOrThrow({
      where: { id },
      select: { finishedAt: true },
    });
    assert.equal(
      row.finishedAt?.getTime(),
      startedAt.getTime() + EXAM_DURATION_SECONDS * MS
    );
  });

  test("muddat tugagandan KEYIN kelgan javob ballga qo'shilmaydi", async () => {
    const unit = await createUnit(fixture, "kechikkan");
    const startedAt = expiredStart(3600);
    const id = await createAttempt({
      studentId: unit.student.id,
      groupId: unit.group.id,
      startedAt,
    });
    await answer(id, questionIds[0], true, new Date(startedAt.getTime() + 10 * MS));
    // Taymerdan keyin: soatlar sinxron emasligi yoki `saveAnswer` ning
    // 409'dan oldin qabul qilib ulgurgan chekka holati.
    await answer(
      id,
      questionIds[1],
      true,
      new Date(startedAt.getTime() + (EXAM_DURATION_SECONDS + 300) * MS)
    );

    await finalizeExpiredAttemptsIn({ studentId: unit.student.id });

    const row = await prisma.attempt.findUniqueOrThrow({
      where: { id },
      select: { score: true },
    });
    // Ikkinchi javob hisobga olinmaydi: 4 tadan 1 tasi → 25%.
    assert.equal(row.score, 25);
  });

  test("urinishga tegishli bo'lmagan savolning javobi ballga qo'shilmaydi", async () => {
    const unit = await createUnit(fixture, "begona-savol");
    const startedAt = expiredStart();
    const id = await createAttempt({
      studentId: unit.student.id,
      groupId: unit.group.id,
      startedAt,
      questionIds: questionIds.slice(0, 2),
    });
    await answer(id, questionIds[0], true, new Date(startedAt.getTime() + 10 * MS));
    // Bu savol urinishning `questionIds` ida YO'Q.
    await answer(id, questionIds[3], true, new Date(startedAt.getTime() + 20 * MS));

    await finalizeExpiredAttemptsIn({ studentId: unit.student.id });

    const row = await prisma.attempt.findUniqueOrThrow({
      where: { id },
      select: { score: true },
    });
    // 2 ta savoldan 1 tasi → 50%, 100% emas.
    assert.equal(row.score, 50);
  });
});

/** Sessiya foydalanuvchisi — `canTakeAttempt` faqat rol va ID'ga qaraydi. */
function sessionUser(id: string, role: SessionUser["role"] = "STUDENT"): SessionUser {
  return {
    id,
    role,
    organizationId: fixture.organization.id,
    sessionVersion: 0,
    switches: NO_ORGANIZATION_SWITCHES,
  };
}

/**
 * `finishAttempt` — o'quvchi "Yakunlash" tugmasini bosgan yo'l.
 *
 * `finalizeExpiredAttemptsIn` bilan AYNI ballni va AYNI `finishedAt` ni
 * yozishi shart: ilgari ikki yo'l bir xil urinishga boshqa-boshqa vaqt
 * yozardi va ustozning "oxirgi faollik" ustuni siljib ketardi.
 */
describe("finishAttempt — o'quvchining o'zi yakunlagani", () => {
  test("ball yoziladi va qaytariladi", async () => {
    const unit = await createUnit(fixture, "yakunlash");
    const startedAt = new Date(Date.now() - 60 * MS);
    const id = await createAttempt({
      studentId: unit.student.id,
      groupId: unit.group.id,
      startedAt,
      mode: "PRACTICE",
      questionIds: questionIds.slice(0, 2),
    });
    await answer(id, questionIds[0], true, new Date(startedAt.getTime() + 5 * MS));
    await answer(id, questionIds[1], false, new Date(startedAt.getTime() + 10 * MS));

    const result = await finishAttempt({
      user: sessionUser(unit.student.id),
      attemptId: id,
    });
    assert.deepEqual(result, { score: 50, correctCount: 1, totalCount: 2 });

    const row = await prisma.attempt.findUniqueOrThrow({
      where: { id },
      select: { score: true, finishedAt: true },
    });
    assert.equal(row.score, 50);
    assert.ok(row.finishedAt);
  });

  test("BEGONA urinishga 403 — urinish egasi tekshiriladi", async () => {
    const owner = await createUnit(fixture, "egasi");
    const stranger = await createUnit(fixture, "begona");
    const id = await createAttempt({
      studentId: owner.student.id,
      groupId: owner.group.id,
      startedAt: new Date(),
      mode: "PRACTICE",
    });

    await assert.rejects(
      () => finishAttempt({ user: sessionUser(stranger.student.id), attemptId: id }),
      (error: unknown) => error instanceof AttemptError && error.status === 403
    );
    const row = await prisma.attempt.findUniqueOrThrow({
      where: { id },
      select: { finishedAt: true },
    });
    assert.equal(row.finishedAt, null, "begona so'rov urinishni yopmasligi kerak");
  });

  test("yo'q urinishga 404, ikkinchi marta yakunlashga 409", async () => {
    const unit = await createUnit(fixture, "409");
    await assert.rejects(
      () => finishAttempt({ user: sessionUser(unit.student.id), attemptId: "yoq-urinish" }),
      (error: unknown) => error instanceof AttemptError && error.status === 404
    );

    const id = await createAttempt({
      studentId: unit.student.id,
      groupId: unit.group.id,
      startedAt: new Date(),
      mode: "PRACTICE",
    });
    await finishAttempt({ user: sessionUser(unit.student.id), attemptId: id });
    await assert.rejects(
      () => finishAttempt({ user: sessionUser(unit.student.id), attemptId: id }),
      (error: unknown) => error instanceof AttemptError && error.status === 409
    );
  });

  test("vaqti o'tgan imtihonda yakunlanish vaqti muddat tugagan lahza bo'ladi", async () => {
    const unit = await createUnit(fixture, "kech-yakunlash");
    // Yorliq uch soat ochiq turdi, keyin "Yakunlash" bosildi.
    const startedAt = new Date(Date.now() - 3 * 60 * 60 * MS);
    const id = await createAttempt({
      studentId: unit.student.id,
      groupId: unit.group.id,
      startedAt,
    });

    await finishAttempt({ user: sessionUser(unit.student.id), attemptId: id });

    const row = await prisma.attempt.findUniqueOrThrow({
      where: { id },
      select: { finishedAt: true },
    });
    assert.equal(
      row.finishedAt?.getTime(),
      startedAt.getTime() + EXAM_DURATION_SECONDS * MS,
      "`finalizeExpiredAttemptsIn` bilan bir xil vaqt bo'lishi kerak"
    );
  });
});

describe("closeAttemptNow — ruxsat tekshirmaydigan yo'l", () => {
  test("mashqni hozir yopadi va ballini yozadi", async () => {
    const unit = await createUnit(fixture, "darhol");
    const startedAt = new Date(Date.now() - 30 * MS);
    const id = await createAttempt({
      studentId: unit.student.id,
      groupId: unit.group.id,
      startedAt,
      mode: "PRACTICE",
      questionIds: questionIds.slice(0, 4),
    });
    await answer(id, questionIds[0], true, new Date(startedAt.getTime() + MS));
    await answer(id, questionIds[1], true, new Date(startedAt.getTime() + 2 * MS));
    await answer(id, questionIds[2], true, new Date(startedAt.getTime() + 3 * MS));

    await closeAttemptNow({
      id,
      mode: "PRACTICE",
      startedAt,
      questionIds: questionIds.slice(0, 4),
    });

    const row = await prisma.attempt.findUniqueOrThrow({
      where: { id },
      select: { score: true, finishedAt: true },
    });
    assert.equal(row.score, 75);
    assert.ok(row.finishedAt);
  });

  test("allaqachon yakunlangan urinishni qayta yozmaydi va xato bermaydi", async () => {
    const unit = await createUnit(fixture, "darhol-409");
    const startedAt = new Date(Date.now() - 30 * MS);
    const finishedAt = new Date(Date.now() - 10 * MS);
    const id = await createAttempt({
      studentId: unit.student.id,
      groupId: unit.group.id,
      startedAt,
      mode: "PRACTICE",
      finishedAt,
      score: 80,
    });

    // Xato KUTILMAYDI: chaqiruvchi (`saveAnswer`) uchun "allaqachon
    // yopilgan" holat normal — shartli `updateMany` buni o'zi hal qiladi.
    await closeAttemptNow({ id, mode: "PRACTICE", startedAt, questionIds });

    const row = await prisma.attempt.findUniqueOrThrow({
      where: { id },
      select: { score: true, finishedAt: true },
    });
    assert.equal(row.score, 80);
    assert.equal(row.finishedAt?.getTime(), finishedAt.getTime());
  });
});
