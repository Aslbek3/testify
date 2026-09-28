import sharp from "sharp";

/**
 * Rasmni saqlashdan oldin kichraytirish va WebP'ga o'tkazish.
 *
 * Muammo: savol rasmi ham, to'lov cheki ham telefondan yuklanadi va
 * hozirgi telefon 3-5 MB, 4000px kenglikdagi JPEG beradi. U diskka
 * SHU HOLICHA tushardi va o'quvchiga ham shu holicha yuborilardi —
 * 840px joyga 4000px rasm. Mobil internetda bu har savolda bir necha
 * soniya va bir necha megabayt.
 *
 * Yechim yuklash paytida: rasm bir marta kichraytiriladi, keyin minglab
 * marta shu holicha beriladi. Ish vaqtida qayta hisoblash yo'q.
 *
 * WebP tanlandi: bir xil sifatda JPEG'dan ~25-35% kichik va barcha
 * zamonaviy brauzerlar qo'llab-quvvatlaydi (Safari 14+, 2020 yil).
 * Eski brauzer uchun zaxira YO'Q — ilova baribir zamonaviy Next.js
 * xususiyatlariga tayanadi.
 *
 * EXIF ma'lumoti ataylab TASHLAB YUBORILADI (`sharp` standart bo'yicha
 * shunday qiladi): telefon rasmida GPS koordinatalari bo'lishi mumkin va
 * to'lov cheki bilan birga o'quvchining uy manzili bazaga tushib
 * qolishini xohlamaymiz.
 */

/** Savol rasmi: test ekranida eng kengi ~840px, ikki barobar zichlik uchun 1400. */
export const QUESTION_IMAGE_MAX_WIDTH = 1400;

/**
 * Chek: o'qilishi SHART (summa, sana, karta raqami), shuning uchun
 * kengroq. Direktor uni kattalashtirib ko'radi.
 */
export const RECEIPT_MAX_WIDTH = 1800;

/** WebP sifati — 82 da ko'z farqni sezmaydi, hajm esa sezilarli tushadi. */
const WEBP_QUALITY = 82;

export type OptimizedImage = { bytes: Uint8Array; mime: string };

/**
 * Rasmni kichraytiradi va WebP qiladi.
 *
 * Kengligi allaqachon chegaradan kichik bo'lsa KENGAYTIRILMAYDI
 * (`withoutEnlargement`) — kichik diagrammani cho'zish uni xiralashtirardi.
 *
 * Xato bo'lsa `null` qaytaradi (buzuq fayl, qo'llab-quvvatlanmaydigan
 * format). Chaqiruvchi o'zi qaror qiladi: savol rasmida bu "rad etish",
 * chekda esa asl faylni saqlab qolish mumkin.
 */
export async function optimizeImage(
  bytes: Uint8Array,
  maxWidth: number
): Promise<OptimizedImage | null> {
  try {
    const output = await sharp(bytes)
      // Ba'zi telefon rasmlari faqat EXIF'dagi `Orientation` bilan
      // to'g'ri turadi; EXIF tashlab yuborilgani uchun burilish
      // baytlarning o'ziga qo'llanishi kerak.
      .rotate()
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    return { bytes: new Uint8Array(output), mime: "image/webp" };
  } catch {
    return null;
  }
}
