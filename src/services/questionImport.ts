import { prisma } from "@/lib/prisma";
import { MIN_OPTIONS, MAX_OPTIONS } from "@/lib/questionOptions";
import { isAllowedQuestionImageUrl } from "@/lib/questionImages";
import { MAX_IMPORT_QUESTIONS } from "@/lib/questionImport";

/**
 * Savollarni ommaviy import qilish.
 *
 * Nega kerak: bazani bittalab forma orqali to'ldirish real emas —
 * mingga yaqin savol kerak. Import esa tayyorlangan ro'yxatni bir
 * urinishda kiritadi.
 *
 * Uch qoida:
 * 1. AVVAL hammasi tekshiriladi, keyin yoziladi. Yarim import — eng yomon
 *    holat: qaysi savol kirgan, qaysi biri yo'qligini keyin qo'lda
 *    aniqlashga to'g'ri kelardi.
 * 2. Takror savol (shu mavzuda AYNI matn) jimgina o'tkazib yuboriladi va
 *    hisobotda ko'rsatiladi — ro'yxatni ikki marta yuborish xavfsiz.
 * 3. Mavzu nomi bo'yicha topiladi; yo'q bo'lsa YARATILADI va hisobotda
 *    aytiladi (imlo xatosi jimgina yangi mavzu ochib yubormasin).
 */

export class QuestionImportError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type ImportedQuestion = {
  topic: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string | null;
  legalReference?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
};

export type ImportResult = {
  created: number;
  /** Shu mavzuda ayni matnli savol allaqachon bor edi. */
  skipped: number;
  createdTopics: string[];
  /** Qatorlar bo'yicha xatolar — hech narsa yozilmagan bo'ladi. */
  errors: { row: number; message: string }[];
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalString(value: unknown): string | null {
  const text = asString(value);
  return text ? text : null;
}

/**
 * Bitta qatorni tekshiradi. Xato matni foydalanuvchiga ko'rinadi,
 * shuning uchun u aniq bo'lishi kerak: "3-qatorda variant yetishmaydi".
 */
function validateRow(raw: unknown, row: number): ImportedQuestion | { row: number; message: string } {
  if (typeof raw !== "object" || raw === null) {
    return { row, message: "Qator obyekt emas" };
  }
  const item = raw as Record<string, unknown>;

  const topic = asString(item.topic);
  if (!topic) return { row, message: "Mavzu nomi (topic) yo'q" };

  const text = asString(item.text);
  if (!text) return { row, message: "Savol matni (text) yo'q" };

  const options = Array.isArray(item.options) ? item.options.map(asString) : [];
  if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
    return {
      row,
      message: `Variantlar soni ${MIN_OPTIONS} tadan ${MAX_OPTIONS} tagacha bo'lishi kerak (hozir ${options.length} ta)`,
    };
  }
  if (options.some((option) => !option)) {
    return { row, message: "Bo'sh variant bor" };
  }

  const correctOptionIndex = item.correctOptionIndex;
  if (
    typeof correctOptionIndex !== "number" ||
    !Number.isInteger(correctOptionIndex) ||
    correctOptionIndex < 0 ||
    correctOptionIndex >= options.length
  ) {
    return {
      row,
      message: `To'g'ri javob raqami (correctOptionIndex) 0 dan ${options.length - 1} gacha bo'lishi kerak`,
    };
  }

  const imageUrl = asOptionalString(item.imageUrl);
  if (imageUrl && !isAllowedQuestionImageUrl(imageUrl)) {
    return { row, message: "Rasm manzili faqat shu saytdagi rasm bo'lishi mumkin" };
  }

  return {
    topic,
    text,
    options,
    correctOptionIndex,
    explanation: asOptionalString(item.explanation),
    legalReference: asOptionalString(item.legalReference),
    imageUrl,
    imageAlt: asOptionalString(item.imageAlt),
  };
}

export async function importQuestions(rawItems: unknown): Promise<ImportResult> {
  if (!Array.isArray(rawItems)) {
    throw new QuestionImportError("Ro'yxat massiv ko'rinishida bo'lishi kerak");
  }
  if (rawItems.length === 0) {
    throw new QuestionImportError("Ro'yxat bo'sh");
  }
  if (rawItems.length > MAX_IMPORT_QUESTIONS) {
    throw new QuestionImportError(
      `Bir urinishda ${MAX_IMPORT_QUESTIONS} tagacha savol yuborish mumkin (hozir ${rawItems.length} ta)`
    );
  }

  const valid: ImportedQuestion[] = [];
  const errors: { row: number; message: string }[] = [];
  for (const [index, raw] of rawItems.entries()) {
    const result = validateRow(raw, index + 1);
    if ("message" in result) errors.push(result);
    else valid.push(result);
  }
  // Bitta xato bo'lsa ham hech narsa yozilmaydi (1-qoida).
  if (errors.length > 0) {
    return { created: 0, skipped: 0, createdTopics: [], errors };
  }

  const topicNames = [...new Set(valid.map((item) => item.topic))];
  const existingTopics = await prisma.topic.findMany({
    where: { name: { in: topicNames, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  const topicIdByName = new Map(
    existingTopics.map((topic) => [topic.name.toLowerCase(), topic.id])
  );
  const createdTopics = topicNames.filter((name) => !topicIdByName.has(name.toLowerCase()));

  // Takrorlarni aniqlash uchun shu mavzulardagi mavjud savol matnlari.
  const existingQuestions = await prisma.question.findMany({
    where: { topicId: { in: existingTopics.map((t) => t.id) } },
    select: { topicId: true, text: true },
  });
  const existingKeys = new Set(
    existingQuestions.map((q) => `${q.topicId}::${q.text.trim().toLowerCase()}`)
  );

  return prisma.$transaction(async (tx) => {
    for (const name of createdTopics) {
      const topic = await tx.topic.create({ data: { name }, select: { id: true, name: true } });
      topicIdByName.set(topic.name.toLowerCase(), topic.id);
    }

    let created = 0;
    let skipped = 0;
    // Bir yuborishning O'ZIDA takrorlangan savol ham o'tkazib yuboriladi.
    const seen = new Set(existingKeys);

    for (const item of valid) {
      const topicId = topicIdByName.get(item.topic.toLowerCase())!;
      const key = `${topicId}::${item.text.toLowerCase()}`;
      if (seen.has(key)) {
        skipped++;
        continue;
      }
      seen.add(key);
      await tx.question.create({
        data: {
          topicId,
          text: item.text,
          options: item.options,
          correctOptionIndex: item.correctOptionIndex,
          explanation: item.explanation ?? null,
          legalReference: item.legalReference ?? null,
          imageUrl: item.imageUrl ?? null,
          imageAlt: item.imageAlt ?? null,
        },
      });
      created++;
    }

    return { created, skipped, createdTopics, errors: [] };
  });
}
