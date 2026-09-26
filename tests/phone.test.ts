import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, formatPhone } from "../src/lib/phone";

/**
 * Telefon raqami — qabulxona o'quvchi bilan aynan shu orqali bog'lanadi.
 *
 * Kiritish erkin (odam qanday yozsa shunday), saqlash esa BITTA shaklda.
 * Agar normalizatsiya buzilsa, bir xil odam bazada ikki xil raqam bilan
 * turib qoladi.
 */
describe("normalizePhone", () => {
  test("to'liq xalqaro shakl", () => {
    assert.equal(normalizePhone("+998901234567"), "+998901234567");
  });

  test("bo'shliq va tire bilan yozilgani", () => {
    assert.equal(normalizePhone("+998 90 123 45 67"), "+998901234567");
    assert.equal(normalizePhone("998-90-123-45-67"), "+998901234567");
    assert.equal(normalizePhone("(90) 123 45 67"), "+998901234567");
  });

  test("mamlakat kodisiz — 9 ta raqam", () => {
    assert.equal(normalizePhone("901234567"), "+998901234567");
  });

  test("oldiga nol qo'yib yozilgani", () => {
    assert.equal(normalizePhone("0901234567"), "+998901234567");
  });

  test("bo'sh satr — null (telefon majburiy emas)", () => {
    assert.equal(normalizePhone(""), null);
    assert.equal(normalizePhone("   "), null);
  });

  test("noto'g'ri uzunlik — false", () => {
    assert.equal(normalizePhone("12345"), false);
    assert.equal(normalizePhone("9012345678901234"), false);
  });

  test("harf aralashgan qiymat raqamlariga qarab baholanadi", () => {
    // Raqamlar to'g'ri bo'lsa qabul qilinadi — odam "tel: 90 123 45 67"
    // deb yozib yuborishi mumkin.
    assert.equal(normalizePhone("tel 90 123 45 67"), "+998901234567");
  });
});

describe("formatPhone", () => {
  test("saqlangan shaklni o'qiladigan holga keltiradi", () => {
    assert.equal(formatPhone("+998901234567"), "+998 90 123 45 67");
  });

  test("kutilmagan shaklni o'zgartirmaydi — ma'lumot yashirilmaydi", () => {
    assert.equal(formatPhone("12345"), "12345");
  });
});
