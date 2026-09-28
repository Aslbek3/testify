import { test, describe } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import {
  optimizeImage,
  QUESTION_IMAGE_MAX_WIDTH,
  RECEIPT_MAX_WIDTH,
} from "../src/lib/imageOptimize";

/**
 * Rasm optimallashtirish — telefondan kelgan 4000px surat bazaga va
 * o'quvchiga shu holicha tushmasligi kerak.
 *
 * Testlar haqiqiy rasm bilan ishlaydi (sharp bilan generatsiya
 * qilinadi) — mock emas: bu yerda aynan kodlash va o'lcham o'zgarishi
 * tekshirilyapti, ularni soxtalashtirish testning ma'nosini yo'qotardi.
 */
async function makeJpeg(width: number, height: number): Promise<Uint8Array> {
  const buf = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 40, b: 40 },
    },
  })
    .jpeg()
    .toBuffer();
  return new Uint8Array(buf);
}

describe("optimizeImage", () => {
  test("katta rasm chegaragacha kichrayadi", async () => {
    const input = await makeJpeg(3000, 2000);
    const out = await optimizeImage(input, QUESTION_IMAGE_MAX_WIDTH);
    assert.ok(out, "natija bo'lishi kerak");
    const meta = await sharp(out.bytes).metadata();
    assert.equal(meta.width, QUESTION_IMAGE_MAX_WIDTH);
    assert.equal(meta.format, "webp");
  });

  test("kichik rasm KENGAYTIRILMAYDI", async () => {
    const input = await makeJpeg(400, 300);
    const out = await optimizeImage(input, QUESTION_IMAGE_MAX_WIDTH);
    assert.ok(out);
    const meta = await sharp(out.bytes).metadata();
    assert.equal(meta.width, 400, "cho'zilsa diagramma xiralashardi");
  });

  test("hajm sezilarli kichrayadi", async () => {
    const input = await makeJpeg(3000, 2000);
    const out = await optimizeImage(input, QUESTION_IMAGE_MAX_WIDTH);
    assert.ok(out);
    assert.ok(
      out.bytes.length < input.length,
      `natija kichik bo'lishi kerak: ${out.bytes.length} vs ${input.length}`
    );
  });

  test("chek kengroq chegara bilan", async () => {
    const input = await makeJpeg(3000, 2000);
    const out = await optimizeImage(input, RECEIPT_MAX_WIDTH);
    assert.ok(out);
    const meta = await sharp(out.bytes).metadata();
    assert.equal(meta.width, RECEIPT_MAX_WIDTH);
  });

  test("rasm bo'lmagan ma'lumot null qaytaradi", async () => {
    const out = await optimizeImage(new Uint8Array([1, 2, 3, 4, 5]), 800);
    assert.equal(out, null, "buzuq fayl xato OTMASLIGI kerak");
  });

  test("chegara savol rasmi uchun cheksiz emas", () => {
    // Qiymat tasodifan katta qo'yilib qolmasin: 1400px — test ekranidagi
    // ~840px joyga ikki barobar zichlik uchun yetarli.
    assert.ok(QUESTION_IMAGE_MAX_WIDTH <= 2000);
    assert.ok(RECEIPT_MAX_WIDTH <= 2400);
  });
});
