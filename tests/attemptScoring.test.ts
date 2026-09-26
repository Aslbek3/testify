import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeScore } from "../src/services/attemptScoring";
import { EXAM_DURATION_SECONDS } from "../src/lib/examRules";

/**
 * Ball formulasi — o'quvchining bahosi shundan chiqadi.
 *
 * Ikkita nozik qoida bor va ikkalasi ham xato qilish oson:
 *   1. Javobsiz qolgan savol XATO deb sanaladi (ball `questionIds`
 *      soniga bo'linadi, berilgan javoblar soniga emas).
 *   2. Imtihonda vaqt tugagandan KEYIN kelgan javob sanalmaydi.
 */
const startedAt = new Date("2026-01-01T10:00:00Z");

function answeredAt(secondsAfterStart: number): Date {
  return new Date(startedAt.getTime() + secondsAfterStart * 1000);
}

function answers(list: { isCorrect: boolean; at: number }[]) {
  return list.map((a) => ({ isCorrect: a.isCorrect, answeredAt: answeredAt(a.at) }));
}

describe("computeScore", () => {
  test("hammasi to'g'ri — 100%", () => {
    const attempt = { mode: "PRACTICE" as const, startedAt, questionIds: ["a", "b"] };
    const r = computeScore(attempt, answers([
      { isCorrect: true, at: 10 },
      { isCorrect: true, at: 20 },
    ]));
    assert.equal(r.score, 100);
    assert.equal(r.correctCount, 2);
    assert.equal(r.totalCount, 2);
  });

  test("javobsiz qolgan savol XATO deb sanaladi", () => {
    // 4 ta savol, faqat 2 tasiga javob berilgan va ikkalasi to'g'ri.
    // Ball 100% emas, 50% bo'lishi kerak.
    const attempt = { mode: "EXAM" as const, startedAt, questionIds: ["a", "b", "c", "d"] };
    const r = computeScore(attempt, answers([
      { isCorrect: true, at: 10 },
      { isCorrect: true, at: 20 },
    ]));
    assert.equal(r.totalCount, 4);
    assert.equal(r.correctCount, 2);
    assert.equal(r.score, 50);
  });

  test("imtihonda vaqt tugagandan keyingi javob sanalmaydi", () => {
    const attempt = { mode: "EXAM" as const, startedAt, questionIds: ["a", "b"] };
    const r = computeScore(attempt, answers([
      { isCorrect: true, at: 10 },
      { isCorrect: true, at: EXAM_DURATION_SECONDS + 5 },
    ]));
    assert.equal(r.correctCount, 1, "kechikkan javob hisobga olinmasligi kerak");
    assert.equal(r.score, 50);
  });

  test("MASHQDA vaqt cheklovi yo'q — kech javob ham sanaladi", () => {
    const attempt = { mode: "PRACTICE" as const, startedAt, questionIds: ["a", "b"] };
    const r = computeScore(attempt, answers([
      { isCorrect: true, at: 10 },
      { isCorrect: true, at: EXAM_DURATION_SECONDS + 5000 },
    ]));
    assert.equal(r.correctCount, 2);
    assert.equal(r.score, 100);
  });

  test("savol yo'q bo'lsa nolga bo'linmaydi", () => {
    const attempt = { mode: "PRACTICE" as const, startedAt, questionIds: [] };
    const r = computeScore(attempt, []);
    assert.equal(r.score, 0);
    assert.equal(r.totalCount, 0);
  });

  test("ball butun songa yaxlitlanadi", () => {
    // 3 tadan 1 tasi = 33.33% -> 33
    const attempt = { mode: "PRACTICE" as const, startedAt, questionIds: ["a", "b", "c"] };
    const r = computeScore(attempt, answers([{ isCorrect: true, at: 5 }]));
    assert.equal(r.score, 33);
    assert.ok(Number.isInteger(r.score));
  });
});
