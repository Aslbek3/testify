import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  QUESTION_COUNT,
  EXAM_DURATION_SECONDS,
  EXAM_MAX_WRONG,
  EXAM_PASS_PERCENT,
} from "../src/lib/examRules";

/**
 * Imtihon qoidalari — butun ilova shulardan kelib chiqadi.
 *
 * Nega test kerak: `EXAM_PASS_PERCENT` hisoblab olinadi. Kimdir savollar
 * sonini yoki ruxsat etilgan xato sonini o'zgartirsa, o'tish balli ham
 * siljishi SHART — aks holda o'quvchi panelidagi "Tayyor" yorlig'i bilan
 * haqiqiy natija bir-biriga zid bo'lib qoladi (bu bir marta bo'lgan,
 * `student/page.tsx` dagi `masteryVariant` izohiga qara).
 */
describe("Imtihon qoidalari", () => {
  test("o'tish balli savollar soni va xato chegarasidan kelib chiqadi", () => {
    const expected = Math.round(
      ((QUESTION_COUNT.EXAM - EXAM_MAX_WRONG) / QUESTION_COUNT.EXAM) * 100
    );
    assert.equal(EXAM_PASS_PERCENT, expected);
  });

  test("hozirgi qoida: 20 ta savol, 2 ta xato, 90%", () => {
    assert.equal(QUESTION_COUNT.EXAM, 20);
    assert.equal(EXAM_MAX_WRONG, 2);
    assert.equal(EXAM_PASS_PERCENT, 90);
  });

  test("mashqda savol kamroq va imtihondan farq qiladi", () => {
    assert.ok(QUESTION_COUNT.PRACTICE < QUESTION_COUNT.EXAM);
  });

  test("imtihon vaqti mantiqiy chegarada", () => {
    // Har savolga kamida 30 soniya qolishi kerak — aks holda test
    // bilimni emas, o'qish tezligini o'lchaydi.
    assert.ok(EXAM_DURATION_SECONDS / QUESTION_COUNT.EXAM >= 30);
  });
});
