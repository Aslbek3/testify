import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  readString,
  readRawString,
  readOptionalString,
  readNullableString,
  readInt,
  readBoolean,
  readEnum,
  readStringArray,
  readIntArray,
} from "../src/lib/requestBody";

/**
 * So'rov tanasini o'qish — API'ning tashqi chegarasi.
 *
 * Bu yerda xato qilish oson va oqibati jimgina bo'ladi: noto'g'ri tipdagi
 * qiymat bazaga tushib ketsa, xato ancha keyin, boshqa joyda chiqadi.
 * Shuning uchun har bir yordamchi "kutilmagan kirish"da nima qaytarishi
 * aniq yozib qo'yilgan.
 */
describe("readString", () => {
  test("matnni kesadi", () => {
    assert.equal(readString({ name: "  Ali  " }, "name"), "Ali");
  });
  test("matn bo'lmasa bo'sh satr", () => {
    assert.equal(readString({ name: 42 }, "name"), "");
    assert.equal(readString({ name: null }, "name"), "");
    assert.equal(readString({}, "name"), "");
    assert.equal(readString(null, "name"), "");
  });
});

describe("readRawString", () => {
  test("parol uchun: bo'shliq SAQLANADI", () => {
    assert.equal(readRawString({ password: " a b " }, "password"), " a b ");
  });
});

describe("readOptionalString", () => {
  test("bo'sh satr ham, yo'q maydon ham null", () => {
    assert.equal(readOptionalString({ note: "   " }, "note"), null);
    assert.equal(readOptionalString({}, "note"), null);
  });
  test("qiymat bo'lsa kesilgan holda qaytadi", () => {
    assert.equal(readOptionalString({ note: " izoh " }, "note"), "izoh");
  });
});

describe("readNullableString", () => {
  test("bo'sh satr bo'sh satrligicha qoladi (null EMAS)", () => {
    assert.equal(readNullableString({ imageUrl: "" }, "imageUrl"), "");
  });
  test("maydon yo'q bo'lsa null", () => {
    assert.equal(readNullableString({}, "imageUrl"), null);
  });
  test("qiymat kesilmaydi", () => {
    assert.equal(readNullableString({ s: " a " }, "s"), " a ");
  });
});

describe("readInt", () => {
  test("butun son", () => {
    assert.equal(readInt({ n: 7 }, "n"), 7);
    assert.equal(readInt({ n: 0 }, "n"), 0);
  });
  test("kasr, matn va NaN rad etiladi", () => {
    assert.equal(readInt({ n: 1.5 }, "n"), null);
    assert.equal(readInt({ n: "7" }, "n"), null);
    assert.equal(readInt({ n: NaN }, "n"), null);
  });
});

describe("readBoolean", () => {
  test("faqat haqiqiy boolean", () => {
    assert.equal(readBoolean({ ok: true }, "ok"), true);
    assert.equal(readBoolean({ ok: false }, "ok"), false);
    // "false" satri `true` bo'lib ketmasligi kerak — bu klassik xato.
    assert.equal(readBoolean({ ok: "false" }, "ok"), null);
    assert.equal(readBoolean({ ok: 1 }, "ok"), null);
  });
});

describe("readEnum", () => {
  const ALLOWED = ["RESOLVED", "DISMISSED"] as const;
  test("ro'yxatdagi qiymat", () => {
    assert.equal(readEnum({ s: "RESOLVED" }, "s", ALLOWED), "RESOLVED");
  });
  test("ro'yxatda yo'q qiymat — null", () => {
    assert.equal(readEnum({ s: "DELETED" }, "s", ALLOWED), null);
    assert.equal(readEnum({ s: "resolved" }, "s", ALLOWED), null);
  });
});

describe("massivlar", () => {
  test("matnlar massivi", () => {
    assert.deepEqual(readStringArray({ a: ["x", "y"] }, "a"), ["x", "y"]);
    assert.deepEqual(readStringArray({ a: [] }, "a"), []);
  });
  test("bitta element noto'g'ri bo'lsa BUTUN maydon rad etiladi", () => {
    assert.equal(readStringArray({ a: ["x", 2] }, "a"), null);
    assert.equal(readIntArray({ a: [1, "2"] }, "a"), null);
  });
  test("butun sonlar massivi", () => {
    assert.deepEqual(readIntArray({ a: [1, 2, 3] }, "a"), [1, 2, 3]);
    assert.equal(readIntArray({ a: [1, 2.5] }, "a"), null);
  });
});
