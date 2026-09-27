/**
 * So'rov tanasini (JSON body) o'qish uchun kichik yordamchilar.
 *
 * Nega kerak: 43 ta route bo'ylab 67 marta shunday qator takrorlanardi —
 *
 *     const name = typeof body?.name === "string" ? body.name.trim() : "";
 *     const groupId = typeof body?.groupId === "string" ? body.groupId : "";
 *
 * Uch muammosi bor edi: har yangi route buni qaytadan yozardi, qoida
 * (masalan "matn kesiladi" yoki "son butun bo'lishi kerak") qayta
 * ishlatilmasdi, va TIP tekshiruvdan kelib chiqmasdi — ikkisi bir-biridan
 * ajralib ketishi mumkin edi.
 *
 * Nega tashqi kutubxona (zod kabi) EMAS: loyihaning butun bog'liqlik
 * ro'yxati beshta paketdan iborat (`next`, `react`, `@prisma/client`,
 * `bcryptjs`, `jsonwebtoken`) va bu ataylab. Bu yerda kerak bo'lgani —
 * to'rt xil tipni o'qish va bitta xato matni qaytarish; buning uchun
 * yangi bog'liqlik olib kelish `CLAUDE.md` dagi "keraksiz murakkablik
 * kiritma" qoidasiga zid bo'lardi. Talab murakkablashsa (ichma-ich
 * obyektlar, massivlar sxemasi) qayta ko'riladi.
 *
 * Ishlatilishi:
 *
 *     const body = await readJsonBody(request);
 *     const name = readString(body, "name");           // kesilgan, bo'sh bo'lsa ""
 *     const count = readInt(body, "count");            // son bo'lmasa null
 *     const active = readBoolean(body, "isActive");    // boolean bo'lmasa null
 *
 * Yordamchilar XATO OTMAYDI: har bir route o'z xato matnini va HTTP
 * kodini o'zi tanlaydi (ba'zi joyda "topilmadi" 404, ba'zida 400) —
 * markazlashtirilgan xato bu farqni yo'qotib yuborardi.
 */

/** JSON tanasi — noto'g'ri JSON kelsa `null`. */
export type JsonBody = Record<string, unknown> | null;

/**
 * So'rov tanasini o'qiydi. Buzuq JSON xato OTMAYDI — `null` qaytadi va
 * keyingi `readString` lar bo'sh qiymat beradi, ya'ni route o'zining
 * odatdagi "maydon kerak" xabarini qaytaradi.
 */
export async function readJsonBody(request: Request): Promise<JsonBody> {
  const parsed = await request.json().catch(() => null);
  return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : null;
}

/**
 * Matn maydoni — chetdagi bo'shliqlar OLIB TASHLANADI.
 *
 * Kesish standart, chunki amalda har bir chaqiruv joyi buni qilardi:
 * foydalanuvchi nomni bo'shliq bilan yozib yuborsa, u bazaga shundayligicha
 * tushmasligi kerak. Kesilmagan qiymat kerak bo'lsa (masalan parol)
 * `readRawString` ishlatiladi.
 */
export function readString(body: JsonBody, key: string): string {
  const value = body?.[key];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Matn maydoni — O'ZGARTIRILMAGAN holda.
 *
 * Parol uchun: boshidagi yoki oxiridagi bo'shliq ham parolning qismi va
 * uni jimgina olib tashlash "parolim to'g'ri, lekin kirmayapti" degan
 * tushunarsiz holatga olib kelardi.
 */
export function readRawString(body: JsonBody, key: string): string {
  const value = body?.[key];
  return typeof value === "string" ? value : "";
}

/**
 * Ixtiyoriy matn: maydon umuman berilmagan bo'lsa `null`.
 *
 * Bo'sh satrdan farqi muhim: "izohni o'chir" (bo'sh satr) va "izohga
 * tegma" (maydon yo'q) — ikki boshqa niyat.
 */
export function readOptionalString(body: JsonBody, key: string): string | null {
  const value = body?.[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Matn yoki `null` — qiymat O'ZGARTIRILMAYDI.
 *
 * `readOptionalString` dan farqi: bo'sh satr bo'sh satrligicha qoladi,
 * `null` ga aylanmaydi. Bu farq bazaga yoziladigan maydonlarda muhim:
 * `imageUrl: ""` va `imageUrl: null` — ikki boshqa qiymat va mavjud
 * route'lar aynan shu xatti-harakatga tayanadi.
 */
export function readNullableString(body: JsonBody, key: string): string | null {
  const value = body?.[key];
  return typeof value === "string" ? value : null;
}

/** Butun son — son bo'lmasa yoki kasr bo'lsa `null`. */
export function readInt(body: JsonBody, key: string): number | null {
  const value = body?.[key];
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

/** Boolean — aynan `true`/`false` bo'lmasa `null` ("berilmagan" ma'nosida). */
export function readBoolean(body: JsonBody, key: string): boolean | null {
  const value = body?.[key];
  return typeof value === "boolean" ? value : null;
}

/**
 * Ruxsat etilgan qiymatlar ro'yxatidan biri (enum).
 *
 * Ro'yxatda bo'lmagan qiymat `null` — route uni "noto'g'ri qiymat" deb
 * qaytaradi. Shu bilan `status` kabi maydonlar uchun har joyda
 * `x !== "A" && x !== "B"` yozish kerak bo'lmaydi.
 */
export function readEnum<T extends string>(
  body: JsonBody,
  key: string,
  allowed: readonly T[]
): T | null {
  const value = body?.[key];
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

/** Matnlar massivi — element matn bo'lmasa butun maydon `null`. */
export function readStringArray(body: JsonBody, key: string): string[] | null {
  const value = body?.[key];
  if (!Array.isArray(value)) return null;
  return value.every((item) => typeof item === "string") ? (value as string[]) : null;
}

/** Butun sonlar massivi — element butun son bo'lmasa `null`. */
export function readIntArray(body: JsonBody, key: string): number[] | null {
  const value = body?.[key];
  if (!Array.isArray(value)) return null;
  return value.every((item) => typeof item === "number" && Number.isInteger(item))
    ? (value as number[])
    : null;
}
