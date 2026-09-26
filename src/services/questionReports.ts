import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { REPORT_REASON_MAX_LENGTH } from "@/lib/questionReportLimits";

/**
 * Savolga shikoyat — "bu savol yoki uning javobi noto'g'ri".
 *
 * Nega kerak: savollar import orqali kiritiladi va ularda xato bo'ladi
 * (noto'g'ri belgilangan to'g'ri javob, tushib qolgan variant, ikki
 * ma'noli matn). Bugungacha buni bildirishning yo'li yo'q edi: o'quvchi
 * ustoziga aytardi, ustoz esa hech kimga ayta olmasdi — savollar bazasini
 * faqat owner boshqaradi.
 *
 * Bu "xabarlar" tizimining ARZON muqobili. Erkin yozishma emas: signal
 * doim aniq bitta savolga bog'langan, ya'ni owner uni ochib darhol
 * tekshira oladi.
 *
 * `listLowQualityQuestions` (xato foizi bo'yicha) bilan birga ishlaydi:
 * u STATISTIKA, bu esa ODAMNING gapi. Ikkalasi bir savolga ko'rsatsa —
 * savol aniq noto'g'ri.
 */

export class QuestionReportError extends Error {
  constructor(
    message: string,
    readonly status: number = 400
  ) {
    super(message);
  }
}

// Izoh uzunligi chegarasi (`lib/questionReportLimits.ts`) — klient
// komponenti ham shuni ishlatadi, shuning uchun u Prisma'siz faylda.
export { REPORT_REASON_MAX_LENGTH } from "@/lib/questionReportLimits";

export type QuestionReportItem = {
  id: string;
  questionId: string;
  questionText: string;
  /** Mavzu sahifasiga havola uchun — savolning o'z sahifasi yo'q. */
  topicId: string;
  topicName: string;
  reason: string | null;
  reporterName: string;
  createdAt: Date;
};

/**
 * Shikoyat qo'shadi.
 *
 * Bir odam bir savolga bir marta shikoyat qiladi (`@@unique`): takroriy
 * yuborish xato emas — tugma ikki marta bosilishi mumkin va bu
 * foydalanuvchiga muammo bo'lib ko'rinmasligi kerak.
 */
export async function reportQuestion(input: {
  questionId: string;
  reportedById: string;
  reason?: string | null;
}): Promise<void> {
  const question = await prisma.question.findUnique({
    where: { id: input.questionId },
    select: { id: true },
  });
  if (!question) throw new QuestionReportError("Savol topilmadi", 404);

  const reason = input.reason?.trim().slice(0, REPORT_REASON_MAX_LENGTH) || null;

  try {
    await prisma.questionReport.create({
      data: {
        questionId: input.questionId,
        reportedById: input.reportedById,
        reason,
      },
    });
  } catch (error) {
    const isDuplicate =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (!isDuplicate) throw error;
    // Allaqachon shikoyat qilingan — hech narsa o'zgarmaydi.
  }
}

/** Owner uchun ko'rib chiqilmagan shikoyatlar, eng eskisi birinchi. */
export async function listOpenReports(): Promise<QuestionReportItem[]> {
  const rows = await prisma.questionReport.findMany({
    where: { status: "OPEN" },
    // Eng eskisi birinchi: kutib qolgan shikoyat unutilmasin.
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      questionId: true,
      reason: true,
      createdAt: true,
      reportedBy: { select: { name: true } },
      question: {
        select: {
          text: true,
          topicId: true,
          topic: { select: { name: true } },
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    questionId: row.questionId,
    questionText: row.question.text,
    topicId: row.question.topicId,
    topicName: row.question.topic.name,
    reason: row.reason,
    reporterName: row.reportedBy.name,
    createdAt: row.createdAt,
  }));
}

export async function countOpenReports(): Promise<number> {
  return prisma.questionReport.count({ where: { status: "OPEN" } });
}

/**
 * Shikoyatni yopadi.
 *
 * `RESOLVED` — savol tuzatildi, `DISMISSED` — savol to'g'ri edi.
 * Ikkalasi ham ro'yxatdan chiqaradi; farqi kelajakda "qaysi o'quvchi
 * asossiz shikoyat qiladi" degan savolga javob berish uchun saqlanadi.
 */
export async function resolveReport(input: {
  reportId: string;
  status: "RESOLVED" | "DISMISSED";
}): Promise<void> {
  const updated = await prisma.questionReport.updateMany({
    where: { id: input.reportId, status: "OPEN" },
    data: { status: input.status, resolvedAt: new Date() },
  });
  if (updated.count === 0) {
    throw new QuestionReportError("Shikoyat topilmadi yoki allaqachon yopilgan", 404);
  }
}
