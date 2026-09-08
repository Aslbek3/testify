import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toStringArray } from "@/lib/json";

/** "Xatolarim" ro'yxatining bitta qatori — bitta SAVOL (bitta javob emas). */
export type MistakeItem = {
  questionId: string;
  text: string;
  topicName: string;
  /**
   * O'quvchining shu savolga bergan OXIRGI javobi matni.
   *
   * `null` bo'lishi mumkin: savolning variantlari keyinchalik tahrirlangan
   * bo'lsa (owner savolni o'zgartirsa), eski javobning indeksi endi mavjud
   * bo'lmagan variantga ko'rsatib qolishi mumkin.
   */
  lastAnswerText: string | null;
  correctAnswerText: string;
  explanation: string | null;
  /** YHQ band raqami — izohning huquqiy asosi. Ixtiyoriy. */
  legalReference: string | null;
  /** Shu savolga necha marta noto'g'ri javob berilgan (barcha urinishlar bo'yicha). */
  wrongCount: number;
  /** Eng oxirgi XATO javob vaqti — tartiblash uchun ham, ko'rsatish uchun ham. */
  lastWrongAt: Date;
  /**
   * Oxirgi javob to'g'ri bo'lsa `true` — ya'ni o'quvchi ilgari xato qilgan,
   * keyin o'rgangan. Shu bayroq ro'yxatni "Hali xato" va "Tuzatilgan" deb
   * ikkiga bo'ladi.
   */
  isFixed: boolean;
};

export type StudentMistakes = {
  items: MistakeItem[];
  stillWrongCount: number;
  fixedCount: number;
  /**
   * Umuman yakunlangan urinish bormi. Bo'sh ro'yxatning ikki xil sababini
   * ajratish uchun kerak: "hali test yechmagansiz" va "test yechgansiz,
   * lekin xato qilmagansiz" — bular o'quvchiga butunlay boshqa narsa
   * aytadi, ikkalasiga bir xil "xato yo'q" yozuvi chiqarish noto'g'ri
   * bo'lardi.
   */
  hasFinishedAttempt: boolean;
};

/** $queryRaw qaytaradigan xom qator. */
type MistakeRow = {
  questionId: string;
  text: string;
  options: Prisma.JsonValue;
  correctOptionIndex: number;
  explanation: string | null;
  legalReference: string | null;
  topicName: string;
  wrongCount: number;
  lastWrongAt: Date;
  lastIsCorrect: boolean;
  lastSelectedOptionIndex: number;
};

/**
 * O'quvchi hech bo'lmaganda bir marta noto'g'ri javob bergan BARCHA savollar.
 *
 * Qaysi urinishlar hisobga olinadi
 * -------------------------------
 * FAQAT yakunlangan urinishlar (`finishedAt IS NOT NULL`), lekin rejim
 * bo'yicha filtr YO'Q — mashq ham, imtihon ham kiradi. Bu panel
 * statistikasidan (u faqat `EXAM`) ataylab farq qiladi: u yerda raqamlar
 * bir-biri bilan solishtiriladi, shuning uchun o'lchov bir xil bo'lishi
 * shart. Bu yerda esa solishtiriladigan raqam yo'q — bu o'lchov emas, o'quv
 * vositasi, va ko'proq material o'quvchiga foydali. ⚠️ Shu sababli sahifada
 * manba ochiq yozilgan, aks holda o'quvchi bu sonlarni panel raqamlariga
 * solishtirib, zid deb o'ylaydi.
 *
 * Javobsiz qolgan savollar KIRMAYDI
 * ---------------------------------
 * Javobsiz savolda `AttemptAnswer` qatori umuman yaratilmaydi, ya'ni
 * ko'rsatadigan "sizning javobingiz" ham yo'q. Ballda javobsiz xato deb
 * sanaladi (`getMasteryByTopic` uni ataylab qo'shadi), lekin bu ro'yxatning
 * maqsadi boshqa — XATONI TAHLIL qilish: "nimani noto'g'ri o'ylagan
 * edingiz". Shuning uchun bu yerda hisob `AttemptAnswer` dan boshlanadi va
 * faqat javob berilgan, ammo noto'g'ri bo'lganlar kiradi.
 *
 * Agregatsiya bazada
 * ------------------
 * Har bir savol uchun uchta narsa kerak: nechta xato, oxirgi xato qachon va
 * OXIRGI javob to'g'ri bo'lganmi. Uchalasi ham bitta `GROUP BY` bilan
 * olinadi — o'quvchining barcha javob qatorlarini Node'ga tortib olib
 * yig'ish o'rniga savol boshiga bitta qator qaytadi.
 */
export async function getStudentMistakes(studentId: string): Promise<StudentMistakes> {
  const [rows, finishedAttemptCount] = await Promise.all([
    prisma.$queryRaw<MistakeRow[]>`
      WITH answers AS (
        SELECT
          aa."questionId",
          aa."isCorrect",
          aa."selectedOptionIndex",
          aa."answeredAt",
          aa."id"
        FROM "AttemptAnswer" aa
        JOIN "Attempt" a ON a."id" = aa."attemptId"
        WHERE a."studentId" = ${studentId}
          AND a."finishedAt" IS NOT NULL
          -- Imtihon muddatidan keyin kelgan javoblar bu yerda ATAYLAB
          -- chiqarib tashlanmaydi. computeScore/getAttemptResult ularni
          -- filtrlaydi, lekin o'sha filtrning sababi boshqa: saqlangan BALL
          -- bilan sahifada qayta hisoblangan raqamlar bir-biriga zid
          -- bo'lmasligi kerak. Bu yerda esa ball ham, o'tish/o'tmaslik ham
          -- hisoblanmaydi — faqat "shu savolda nimani noto'g'ri o'ylagan
          -- edingiz" ko'rsatiladi, va o'sha xato javob real ravishda
          -- berilgan. getMasteryByTopic ham xuddi shunday filtrlamaydi.
      ),
      per_question AS (
        SELECT
          "questionId",
          COUNT(*) FILTER (WHERE NOT "isCorrect")::int AS "wrongCount",
          MAX("answeredAt") FILTER (WHERE NOT "isCorrect") AS "lastWrongAt",
          -- Oxirgi javob: array_agg(... ORDER BY "answeredAt" DESC) ning
          -- birinchi elementi. Ikkilamchi tartib "id" DESC — bir soniyada
          -- ikki javob yozilib qolsa (mashq va imtihon deyarli bir vaqtda)
          -- natija tasodifiy bo'lib qolmasin.
          (array_agg("isCorrect" ORDER BY "answeredAt" DESC, "id" DESC))[1]
            AS "lastIsCorrect",
          (array_agg("selectedOptionIndex" ORDER BY "answeredAt" DESC, "id" DESC))[1]
            AS "lastSelectedOptionIndex"
        FROM answers
        GROUP BY "questionId"
        -- Hech qachon xato qilinmagan savol bu ro'yxatga umuman kirmaydi.
        HAVING COUNT(*) FILTER (WHERE NOT "isCorrect") > 0
      )
      SELECT
        q."id"                 AS "questionId",
        q."text"               AS "text",
        q."options"            AS "options",
        q."correctOptionIndex" AS "correctOptionIndex",
        q."explanation"        AS "explanation",
        q."legalReference"     AS "legalReference",
        t."name"               AS "topicName",
        p."wrongCount",
        p."lastWrongAt",
        p."lastIsCorrect",
        p."lastSelectedOptionIndex"
      FROM per_question p
      JOIN "Question" q ON q."id" = p."questionId"
      JOIN "Topic"    t ON t."id" = q."topicId"
      -- Eng ko'p takrorlangan xato birinchi — o'quvchi shundan boshlashi
      -- kerak. Teng bo'lsa eng yaqinda qilingani ustun (u hali yodda).
      ORDER BY p."wrongCount" DESC, p."lastWrongAt" DESC
    `,
    // Bo'sh ro'yxatning sababini aniqlash uchun — qatorlar kerak emas,
    // faqat son.
    prisma.attempt.count({ where: { studentId, finishedAt: { not: null } } }),
  ]);

  const items: MistakeItem[] = rows.map((row) => {
    const options = toStringArray(row.options);
    return {
      questionId: row.questionId,
      text: row.text,
      topicName: row.topicName,
      lastAnswerText: options[row.lastSelectedOptionIndex] ?? null,
      correctAnswerText: options[row.correctOptionIndex] ?? "",
      explanation: row.explanation,
      legalReference: row.legalReference,
      wrongCount: row.wrongCount,
      lastWrongAt: row.lastWrongAt,
      isFixed: row.lastIsCorrect,
    };
  });

  return {
    items,
    // Sanoq shu yerda, bitta joyda — sahifa ham, yorliqlar ham aynan shu
    // raqamlarni ko'rsatadi, ikki joyda qayta filtrlanmaydi.
    stillWrongCount: items.filter((item) => !item.isFixed).length,
    fixedCount: items.filter((item) => item.isFixed).length,
    hasFinishedAttempt: finishedAttemptCount > 0,
  };
}
