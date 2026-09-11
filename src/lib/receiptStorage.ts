import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

/**
 * To'lov cheklari — diskda, ochiq `public/` papkadan TASHQARIDA.
 *
 * Nega `public/` emas: chekda karta raqami, ism va summa bor. `public/`
 * dagi fayl havolasini bilgan (yoki taxmin qilgan) har kim ochadi —
 * ruxsat tekshiruvi umuman bo'lmaydi. Bu yerdagi fayllar esa faqat
 * `GET /api/student-payments/[id]/receipt` orqali, ruxsat tekshirilgandan
 * keyin beriladi.
 *
 * FAQAT serverda ishlatiladi (`fs`). Klient komponentga kerak bo'lgan
 * qiymatlar (hajm chegarasi, `accept`) `lib/payments.ts` da.
 *
 * ⚠️ Bu papka `scripts/backup.sh` da alohida zaxiralanadi — baza
 * zaxirasi uni o'z ichiga olmaydi.
 */

type ReceiptType = { mime: string; ext: string; magic: number[] };

/**
 * Qabul qilinadigan turlar va ularning "sehrli baytlari" (fayl boshi).
 *
 * Tur fayl nomi yoki brauzer yuborgan `Content-Type` dan EMAS, ichidagi
 * baytlardan aniqlanadi — ikkalasini ham yuboruvchi istalgancha
 * soxtalashtira oladi. Masalan `chek.jpg` deb nomlangan HTML fayl
 * keyin brauzerda ochilganda skript sifatida ishlashi mumkin edi.
 */
const RECEIPT_TYPES: ReceiptType[] = [
  { mime: "image/jpeg", ext: "jpg", magic: [0xff, 0xd8, 0xff] },
  { mime: "image/png", ext: "png", magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "application/pdf", ext: "pdf", magic: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // "%PDF-"
];

/** Saqlash kaliti: tasodifiy UUID + kengaytma. Boshqa hech narsa qabul qilinmaydi. */
const KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|pdf)$/;

function receiptsDir(): string {
  // `turbopackIgnore` — yo'l ish vaqtida aniqlanadi. Busiz Turbopack
  // build paytida bu papkaga qanday fayllar tushishini oldindan bilmay,
  // "ehtimol hammasi kerak" deb butun loyihani server bundle'iga
  // kuzatib (trace qilib) chiqardi.
  return (
    process.env.RECEIPTS_DIR ??
    path.join(/* turbopackIgnore: true */ process.cwd(), "storage", "receipts")
  );
}

/**
 * Kalitdan to'liq yo'l. Kalit qat'iy shablon bo'yicha tekshiriladi —
 * kalit bazadan kelsa ham: `../` kabi qiymat tushib qolsa, diskdagi
 * istalgan faylni o'qib berishga aylanardi.
 */
function keyToPath(key: string): string {
  if (!KEY_PATTERN.test(key)) {
    throw new Error("Noto'g'ri chek kaliti");
  }
  return path.join(/* turbopackIgnore: true */ receiptsDir(), key);
}

export function detectReceiptType(bytes: Uint8Array): ReceiptType | null {
  return (
    RECEIPT_TYPES.find((type) =>
      type.magic.every((byte, index) => bytes[index] === byte)
    ) ?? null
  );
}

/**
 * Chekni diskka yozadi. Tur aniqlanmasa `null` qaytaradi (hech narsa
 * yozilmaydi) — chaqiruvchi foydalanuvchiga tushunarli xato beradi.
 */
export async function saveReceipt(
  bytes: Uint8Array
): Promise<{ key: string; mime: string } | null> {
  const type = detectReceiptType(bytes);
  if (!type) return null;

  const key = `${randomUUID()}.${type.ext}`;
  await fs.mkdir(receiptsDir(), { recursive: true });
  // `wx` — mavjud faylni hech qachon ustidan yozmaydi (UUID to'qnashuvi
  // amalda bo'lmaydi, lekin bo'lsa ham boshqa odamning cheki buzilmasin).
  await fs.writeFile(keyToPath(key), bytes, { flag: "wx" });
  return { key, mime: type.mime };
}

export async function readReceipt(key: string): Promise<Buffer> {
  return fs.readFile(keyToPath(key));
}

/**
 * Faylni o'chiradi. Bazaga yozish muvaffaqiyatsiz bo'lganda chaqiriladi —
 * aks holda diskda hech bir yozuvga bog'lanmagan "yetim" cheklar yig'ilib
 * qolardi. Fayl allaqachon yo'q bo'lsa jim o'tadi.
 */
export async function deleteReceipt(key: string): Promise<void> {
  await fs.rm(keyToPath(key), { force: true });
}
