import { prisma } from "@/lib/prisma";
import type { AttemptMode } from "@prisma/client";

export type StudentOverview = {
  overallScore: number | null;
  /** YAKUNLANGAN urinishlar soni (imtihon + mashq). */
  finishedAttemptCount: number;
  groupName: string | null;
};

export type TopicMastery = {
  topicId: string;
  topicName: string;
  masteryPercent: number;
};

export type AttemptHistoryItem = {
  id: string;
  date: Date;
  score: number | null;
  questionCount: number;
  mode: AttemptMode;
  /**
   * Natija sahifasini faqat yakunlangan urinish uchun ochish mumkin
   * (`getAttemptResult` yakunlanmaganiga 409 qaytaradi). Buni `score !== null`
   * orqali taxmin qilish mumkin edi, lekin bu ikkita alohida ma'noni
   * (ball bor / urinish tugagan) bir-biriga bog'lab qo'yardi.
   */
  isFinished: boolean;
};

/**
 * O'quvchining o'z guruhi ID'si — test boshlanganda Attempt.groupId'ga
 * yozish uchun. Klient tomonidan yuborilgan groupId'ga ishonilmaydi,
 * har doim shu orqali serverda aniqlanadi.
 */
export async function getStudentGroupId(studentId: string): Promise<string | null> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
    select: { groupId: true },
  });
  return profile?.groupId ?? null;
}

/**
 * O'quvchining umumiy ko'rsatkichlari: tayyorgarlik foizi FAQAT imtihon
 * (EXAM) urinishlari bo'yicha hisoblanadi — mashqda javob darhol
 * ko'rsatilgani uchun mashq ballari sun'iy yuqori bo'ladi va aralashtirilsa
 * haqiqiy tayyorgarlikni noto'g'ri ko'rsatadi. Urinishlar soni esa faollik
 * ko'rsatkichi sifatida ikkala rejimni ham o'z ichiga oladi, lekin faqat
 * YAKUNLANGANLARINI sanaydi.
 */
export async function getStudentOverview(studentId: string): Promise<StudentOverview> {
  const [finishedAttemptCount, examAttempts, profile] = await Promise.all([
    // Faqat son kerak — qatorlarni yuklamasdan bazaning o'zi sanaydi.
    //
    // `finishedAt: { not: null }`: ilgari filtr yo'q edi va ochib tashlab
    // ketilgan urinishlar ham sanalardi. Mashqda taymer yo'q, shuning uchun
    // tashlab ketilgan mashq abadiy `finishedAt: null` bo'lib qoladi
    // (`finalizeExpiredAttempts` faqat imtihonni yopadi) — 20 marta mashq
    // boshlab 3 tasini yechgan o'quvchi o'z panelida "20", ustoz jadvalida
    // esa "3" ko'rardi. Ustoz roster'i allaqachon yakunlanganlarni sanaydi,
    // shu qoida bu yerga ham keltirildi: yakunlanmagan urinish o'quvchiga
    // ham natija bermaydi, uni "urinish" deb sanashning ma'nosi yo'q.
    prisma.attempt.count({
      where: { studentId, finishedAt: { not: null } },
    }),
    // Bu yerda esa ballarning o'zi kerak (o'rtachani hisoblash uchun).
    // `finishedAt: { not: null }` ataylab yozilgan: yakunlanmagan urinishda
    // score allaqachon null bo'lgani uchun natija o'zgarmaydi, lekin shart
    // ko'rinib turgani muhim — "ball/o'rtacha/tayyorgarlik" ko'rsatkichlari
    // hamma joyda AYNI qoidada (EXAM + yakunlangan) hisoblanadi va bu qoida
    // score'ning null bo'lishiga tasodifan bog'lanib qolmasligi kerak.
    prisma.attempt.findMany({
      where: { studentId, mode: "EXAM", finishedAt: { not: null } },
      select: { score: true },
    }),
    prisma.studentProfile.findUnique({
      where: { userId: studentId },
      include: { group: { select: { name: true } } },
    }),
  ]);

  const finishedExamScores = examAttempts
    .map((a) => a.score)
    .filter((score): score is number => score !== null);

  const overallScore =
    finishedExamScores.length === 0
      ? null
      : Math.round(
          finishedExamScores.reduce((sum, s) => sum + s, 0) / finishedExamScores.length
        );

  return {
    overallScore,
    finishedAttemptCount,
    groupName: profile?.group.name ?? null,
  };
}

/**
 * Har bir mavzu bo'yicha o'quvchining o'zlashtirish foizi.
 *
 * Faqat YAKUNLANGAN IMTIHON (`mode = 'EXAM'`, `finishedAt IS NOT NULL`)
 * urinishlari hisobga olinadi:
 * - mashqda javob darhol ko'rsatiladi va bir xil savol qayta chiqqanda
 *   o'quvchi uni eslab qoladi, shuning uchun mashq foizi vaqt o'tgani sayin
 *   sun'iy o'sadi. Ball halqasi (`ProgressRing`) allaqachon EXAM-only edi —
 *   mavzu satrlari mashqni ham qo'shgani uchun bitta ekranda 55% va 94%
 *   yonma-yon turardi;
 * - yakunlanmagan urinishning javobsiz savollari hali "xato" emas —
 *   o'quvchi ularga yetib bormagan. Uni qo'shsak, endigina boshlangan
 *   imtihon butun statistikani yerga urardi.
 *
 * Hisob `AttemptAnswer` dan emas, `Attempt.questionIds` dan boshlanadi:
 * javobsiz qolgan savol uchun `AttemptAnswer` qatori umuman yaratilmaydi,
 * shuning uchun eski hisob uni ko'rmasdi va 20 tadan 12 tasiga javob bergan
 * o'quvchi 60% ball ustida barcha mavzuda 100% ko'rsatardi. `LEFT JOIN` +
 * `FILTER (WHERE aa."isCorrect")` javobsizni "to'g'ri emas" deb sanaydi —
 * ball formulasi (`correct / questionIds.length`) bilan aynan bir xil.
 *
 * O'quvchi imtihonda umuman uchratmagan mavzular ro'yxatga tushmaydi.
 */
export async function getMasteryByTopic(studentId: string): Promise<TopicMastery[]> {
  // Agregatsiya bazada bajariladi — o'quvchining har bir javob qatorini
  // Node'ga tortib olib JS'da yig'ish o'rniga, mavzu boshiga bitta qator
  // qaytadi. Prisma'ning groupBy'i bog'langan jadval ustuni (question.topicId)
  // bo'yicha guruhlay olmagani uchun bu yerda $queryRaw ishlatilgan.
  // COUNT natijalari BigInt bo'lib kelmasligi uchun ::int ga keltirilgan.
  const rows = await prisma.$queryRaw<
    { topicId: string; topicName: string; correct: number; total: number }[]
  >`
    SELECT
      t."id"   AS "topicId",
      t."name" AS "topicName",
      COUNT(*) FILTER (WHERE aa."isCorrect")::int AS "correct",
      COUNT(*)::int                               AS "total"
    FROM "Attempt" a
    CROSS JOIN LATERAL unnest(a."questionIds") AS qid
    JOIN "Question" q ON q."id" = qid
    JOIN "Topic"    t ON t."id" = q."topicId"
    LEFT JOIN "AttemptAnswer" aa
           ON aa."attemptId"  = a."id"
          AND aa."questionId" = qid
    WHERE a."studentId" = ${studentId}
      AND a."mode" = 'EXAM'
      AND a."finishedAt" IS NOT NULL
    GROUP BY t."id", t."name"
  `;

  const result: TopicMastery[] = rows.map((row) => ({
    topicId: row.topicId,
    topicName: row.topicName,
    masteryPercent: Math.round((row.correct / row.total) * 100),
  }));

  result.sort((a, b) => a.masteryPercent - b.masteryPercent);

  return result;
}

/**
 * O'quvchining barcha urinishlari, eng so'nggisidan boshlab.
 * Tugallanmagan urinishlarda score null bo'ladi.
 */
export async function getAttemptHistory(studentId: string): Promise<AttemptHistoryItem[]> {
  const attempts = await prisma.attempt.findMany({
    where: { studentId },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      startedAt: true,
      finishedAt: true,
      score: true,
      mode: true,
      questionIds: true,
    },
  });

  return attempts.map((attempt) => ({
    id: attempt.id,
    date: attempt.startedAt,
    score: attempt.score,
    isFinished: attempt.finishedAt !== null,
    // Urinishdagi SAVOLLAR soni — berilgan javoblar soni emas. Ball ham
    // aynan questionIds.length'dan hisoblanadi (javobsiz qolgan savol xato
    // deb sanaladi), shuning uchun javoblar sonini ko'rsatish jadvalda
    // "12 savol / 50%" kabi o'zaro zid qatorlar hosil qilardi.
    questionCount: attempt.questionIds.length,
    mode: attempt.mode,
  }));
}
