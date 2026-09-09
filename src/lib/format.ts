/**
 * O'zbekiston vaqt mintaqasi — UTC+5, yozgi vaqtga o'tish yo'q (1995 yildan
 * beri bekor qilingan). Shu sababli oddiy qat'iy siljish yetarli va
 * `Intl`/ICU ma'lumotlariga bog'liqlik kerak emas.
 */
export const UZBEKISTAN_UTC_OFFSET_HOURS = 5;
const UZBEKISTAN_UTC_OFFSET_MINUTES = UZBEKISTAN_UTC_OFFSET_HOURS * 60;

/**
 * Sanani `kk/oo/yyyy` ko'rinishida, HAR DOIM O'zbekiston vaqti bo'yicha
 * formatlaydi.
 *
 * Ikkita alohida sabab bor va ikkalasi ham hidratsiya nomuvofiqligiga
 * (hydration mismatch) olib kelardi:
 *
 * 1. `Intl.DateTimeFormat` ishlatilmaydi — "uz-UZ" lokali server (Node) va
 *    brauzer ICU ma'lumotlarida kun/oy/yil tartibini boshqacha berishi
 *    mumkin.
 *
 * 2. `getDate()`/`getMonth()`/`getFullYear()` ham ishlatilmaydi — ular
 *    JARAYON vaqt mintaqasida ishlaydi. Server UTC'da, foydalanuvchi esa
 *    UTC+5 da bo'lgani uchun soat 19:00–24:00 UTC oralig'idagi vaqt
 *    serverda bir kun, brauzerda boshqa kun bo'lib chiqardi. Bu jonli
 *    serverda haqiqatan uchradi: o'quvchi panelidagi urinishlar tarixi
 *    React #418 xatosini berardi (server yozgan HTML tashlab yuborilib,
 *    sahifa qaytadan chiziladi).
 *
 * Vaqt mintaqasi ATAYLAB foydalanuvchi qurilmasidan olinmaydi: ustoz va
 * o'quvchi "kechagi imtihon" haqida gaplashganda ikkalasi bir xil sanani
 * ko'rishi kerak, qurilma sozlamasidan qat'i nazar.
 */
export function formatDate(date: Date): string {
  const shifted = new Date(
    date.getTime() + UZBEKISTAN_UTC_OFFSET_MINUTES * 60 * 1000
  );
  // Siljitilgan vaqtdan UTC maydonlari o'qiladi — natija jarayon vaqt
  // mintaqasiga umuman bog'liq emas, ya'ni server va brauzer bir xil
  // satr hosil qiladi.
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const year = shifted.getUTCFullYear();
  return `${day}/${month}/${year}`;
}


/**
 * Ajratgich sifatida uzilmas probel (` `) ishlatiladi: summa tor
 * ustunda "1 200" va "000 so'm" bo'lib ikki qatorga bo'linib ketmasin.
 */
const THOUSANDS_SEPARATOR = " ";

/** Har uch xonadan keyin ajratgich qo'yish uchun (o'ngdan chapga). */
const THOUSANDS_GROUP = /\B(?=(\d{3})+(?!\d))/g;

/**
 * Summani so'mda ko'rsatadi: `1200000` → `1 200 000 so'm`.
 *
 * `Intl.NumberFormat` ATAYLAB ishlatilmaydi — yuqoridagi `formatDate`
 * bilan bir xil sabab: "uz-UZ" lokali Node va brauzer ICU ma'lumotlarida
 * turli ajratgich (probel, apostrof, vergul) berishi mumkin, ya'ni server
 * bir xil, brauzer boshqa satr chizib hidratsiya xatosi kelib chiqardi.
 * Uch xonadan guruhlash qoidasi esa hech qanday lokalga bog'liq emas.
 *
 * Bazada summa butun son va tiyin ishlatilmaydi (`prisma/schema.prisma`,
 * `Payment.amount`), shuning uchun kasr qismi umuman formatlanmaydi.
 */
export function formatAmountUzs(amount: number): string {
  const digits = String(Math.trunc(Math.abs(amount))).replace(
    THOUSANDS_GROUP,
    THOUSANDS_SEPARATOR
  );
  const sign = amount < 0 ? "-" : "";
  return `${sign}${digits}${THOUSANDS_SEPARATOR}so'm`;
}
