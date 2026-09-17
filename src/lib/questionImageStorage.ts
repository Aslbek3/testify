import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

/**
 * Savol rasmlari — diskda, `public/` dan TASHQARIDA.
 *
 * Nega `public/` emas: `next start` build paytida mavjud bo'lgan
 * fayllarni biladi; ish vaqtida qo'shilgani esa serverni qayta
 * ishga tushirmaguncha ishonchli berilmaydi. Bu yerdagi fayllar
 * `GET /api/question-images/[key]` orqali, sessiya tekshirilgandan keyin
 * beriladi — ya'ni savollar bazasi ochiq internetdan ko'chirilmaydi ham.
 *
 * ⚠️ `scripts/backup.sh` `storage/` papkasini zaxiralaydi — bu rasmlar
 * ham o'sha yerda.
 */

type ImageType = { mime: string; ext: string; magic: number[] };

/**
 * Tur fayl nomidan yoki brauzer yuborgan `Content-Type` dan EMAS,
 * ichidagi baytlardan aniqlanadi — ikkalasini ham soxtalashtirish mumkin
 * (`lib/receiptStorage.ts` dagi bilan bir xil sabab).
 */
const IMAGE_TYPES: ImageType[] = [
  { mime: "image/jpeg", ext: "jpg", magic: [0xff, 0xd8, 0xff] },
  { mime: "image/png", ext: "png", magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  // WEBP: "RIFF" .... "WEBP" — 8-11 baytlar alohida tekshiriladi.
  { mime: "image/webp", ext: "webp", magic: [0x52, 0x49, 0x46, 0x46] },
];

const KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

function imagesDir(): string {
  return (
    process.env.QUESTION_IMAGES_DIR ??
    path.join(/* turbopackIgnore: true */ process.cwd(), "storage", "question-images")
  );
}

/** Kalit qat'iy shablonga mos bo'lmasa — yo'l umuman tuzilmaydi (`../` himoyasi). */
function keyToPath(key: string): string {
  if (!KEY_PATTERN.test(key)) {
    throw new Error("Noto'g'ri rasm kaliti");
  }
  return path.join(/* turbopackIgnore: true */ imagesDir(), key);
}

export function detectImageType(bytes: Uint8Array): ImageType | null {
  const type = IMAGE_TYPES.find((candidate) =>
    candidate.magic.every((byte, index) => bytes[index] === byte)
  );
  if (!type) return null;
  if (type.ext === "webp") {
    // "RIFF" bilan boshlanadigan boshqa formatlar ham bor (masalan AVI) —
    // 8-11 baytlarda "WEBP" turishi shart.
    const webp = [0x57, 0x45, 0x42, 0x50];
    if (!webp.every((byte, index) => bytes[8 + index] === byte)) return null;
  }
  return type;
}

export async function saveQuestionImage(
  bytes: Uint8Array
): Promise<{ key: string; mime: string } | null> {
  const type = detectImageType(bytes);
  if (!type) return null;

  const key = `${randomUUID()}.${type.ext}`;
  await fs.mkdir(imagesDir(), { recursive: true });
  await fs.writeFile(keyToPath(key), bytes, { flag: "wx" });
  return { key, mime: type.mime };
}

export async function readQuestionImage(
  key: string
): Promise<{ bytes: Buffer; mime: string }> {
  const bytes = await fs.readFile(keyToPath(key));
  const type = detectImageType(bytes);
  return { bytes, mime: type?.mime ?? "application/octet-stream" };
}
