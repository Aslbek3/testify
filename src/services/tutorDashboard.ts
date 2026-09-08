import { prisma } from "@/lib/prisma";
import type { AttemptMode } from "@prisma/client";
import { readinessFromScore, type ReadinessStatus } from "@/lib/readiness";
import { getMasteryByTopic, type TopicMastery } from "@/services/studentDashboard";

export type TutorGroup = { id: string; name: string };

export type TopicErrorRate = {
  topicId: string;
  topicName: string;
  errorRatePercent: number;
};

export type MissedQuestion = {
  questionId: string;
  questionText: string;
  topicName: string;
  missPercent: number;
};

export type RosterEntry = {
  studentId: string;
  name: string;
  isActive: boolean;
  examAttemptCount: number;
  practiceAttemptCount: number;
  lastActivityAt: Date | null;
  averageScore: number | null;
  status: ReadinessStatus;
};

export type StudentGroupContext = {
  student: { userId: string; organizationId: string | null };
  group: { tutorId: string; organizationId: string };
};

export type StudentDetail = {
  name: string;
  // O'quvchining o'z panelidagi bilan AYNI tip — ataylab: ikkala ekran bir
  // xil funksiyadan (studentDashboard'dagi getMasteryByTopic) oziqlanadi,
  // shuning uchun ustoz va o'quvchi hech qachon boshqa-boshqa foiz ko'rmaydi.
  masteryByTopic: TopicMastery[];
  attempts: { id: string; date: string; score: number | null; mode: AttemptMode }[];
};

/** Ustozga biriktirilgan guruhlar ro'yxati. */
export async function getGroupsForTutor(tutorId: string): Promise<TutorGroup[]> {
  return prisma.group.findMany({
    where: { tutorId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/**
 * So'nggi `days` kun ichida SHU GURUHDA boshlangan va YAKUNLANGAN
 * imtihonlar soni.
 *
 * Filtr `Attempt.groupId` bo'yicha — o'quvchining hozirgi guruhi bo'yicha
 * emas. Farqi: o'quvchi boshqa guruhga ko'chirilsa, uning eski urinishlari
 * eski guruhda qoladi va yangi ustozning ko'rsatkichiga qo'shilib ketmaydi.
 *
 * `finishedAt: { not: null }` shart: ilgari tashlab ketilgan (ochib qo'yib
 * chiqib ketilgan) imtihonlar ham sanalardi va ekranda o'zaro zid raqamlar
 * chiqardi — plitkada "5 imtihon", jadvalda esa o'sha o'quvchilarda
 * "0 imtihon" va "Imtihon topshirilmagan". Jadval va mavzu diagrammasi
 * allaqachon yakunlanganlarni sanaydi, plitka ham shu qoidaga keltirildi.
 */
export async function getRecentExamAttemptCount(
  groupId: string,
  days = 7
): Promise<number> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return prisma.attempt.count({
    where: {
      groupId,
      mode: "EXAM",
      finishedAt: { not: null },
      startedAt: { gte: since },
    },
  });
}

/**
 * Kamida shuncha marta uchragan savol/mavzugina reytingga kiradi.
 *
 * Savollar butun bazadan tasodifiy tanlangani uchun ba'zi savollarga
 * atigi bir marta javob berilgan bo'ladi. Bitta o'quvchi bitta marta
 * xato qilgan savol 100% ko'rsatib, haqiqatan ham muammoli (masalan 30
 * javobdan 24 tasi xato = 80%) savollarni ro'yxatdan siqib chiqarardi.
 *
 * "Uchragan" ikki ro'yxatda ikki xil o'lchanadi va bu ataylab:
 * mavzu bo'yicha — imtihonda BERILGAN savollar soni (javobsizlar ham),
 * savollar reytingida — BERILGAN JAVOBLAR soni (pastdagi izohga qara).
 */
const MIN_ANSWERS_FOR_RANKING = 5;

export type GroupAnalytics = {
  topicErrorRates: TopicErrorRate[];
  mostMissedQuestions: MissedQuestion[];
};

/**
 * Guruhning mavzu bo'yicha xato foizi va eng ko'p xato qilingan savollari.
 *
 * Ikkalasi bitta funksiyada, chunki ikkalasi ham AYNI urinishlar to'plamidan
 * (shu guruhdagi yakunlangan imtihonlar) hisoblanadi — ilgari ular alohida
 * eksport qilinib, ustoz paneli har yuklanganda o'sha og'ir so'rovni ikki
 * marta bajarardi.
 *
 * Ikkala agregatsiya ham BAZADA bajariladi. Ilgari guruhning butun
 * `AttemptAnswer` jadvali savol matni bilan birga Node'ga tortilar edi:
 * 200 o'quvchi x 100 urinish x ~15 javob = 300 000 qator (~60 MB), va
 * PM2 FORK rejimida (bitta jarayon) bu faqat shu sahifani emas, butun
 * ilovani o'ldirardi. Endi mavzu boshiga / savol boshiga bitta qator
 * qaytadi, savollar reytingida esa LIMIT ham bor.
 *
 * Prisma'ning `groupBy`i bog'langan jadval ustuni (question.topicId) bo'yicha
 * guruhlay olmagani va `unnest`/`FILTER` ni umuman bilmagani uchun $queryRaw.
 */
export async function getGroupAnalytics(
  groupId: string,
  missedLimit = 5
): Promise<GroupAnalytics> {
  const [topicRows, questionRows] = await Promise.all([
    // MAVZU BO'YICHA XATO FOIZI — javobsiz qolgan savol XATO deb sanaladi.
    //
    // Shuning uchun hisob `AttemptAnswer` dan emas, `Attempt.questionIds`
    // dan boshlanadi: javobsiz savol uchun `AttemptAnswer` qatori umuman
    // yaratilmaydi. `LEFT JOIN` + `FILTER (WHERE aa."isCorrect")` javobsizni
    // "to'g'ri emas" tomonga qo'shadi. Aynan shu narsa ball formulasida ham
    // bor (`correct / questionIds.length`), shuning uchun endi ustoz
    // ko'rgan mavzu foizi o'quvchining balli bilan mos keladi — ilgari 20
    // tadan 12 tasiga javob bergan o'quvchi 60% ball ustida barcha mavzuda
    // 100% ko'rsatardi.
    prisma.$queryRaw<
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
      WHERE a."groupId" = ${groupId}
        AND a."mode" = 'EXAM'
        AND a."finishedAt" IS NOT NULL
      GROUP BY t."id", t."name"
      HAVING COUNT(*) >= ${MIN_ANSWERS_FOR_RANKING}::int
    `,

    // ENG KO'P XATO QILINGAN SAVOLLAR — bu yerda qoida TESKARI: javobsiz
    // qolgan savol umuman sanalmaydi (`AttemptAnswer` dan boshlanadi).
    //
    // Sabab: bu ro'yxatning maqsadi "qaysi savol qiyin yoki noto'g'ri
    // yozilgan"ni topish. Javobsizlarni qo'shsak, ro'yxat savol qiyinligini
    // emas, savolning urinishdagi O'RNINI ko'rsatadi — vaqt tugaganda har
    // doim oxirgi savollar javobsiz qoladi, ya'ni 18-20-savollar avtomatik
    // "eng qiyin" bo'lib chiqadi va ustozni butunlay noto'g'ri yo'naltiradi.
    prisma.$queryRaw<
      {
        questionId: string;
        questionText: string;
        topicName: string;
        wrong: number;
        total: number;
      }[]
    >`
      SELECT
        q."id"   AS "questionId",
        q."text" AS "questionText",
        t."name" AS "topicName",
        COUNT(*) FILTER (WHERE NOT aa."isCorrect")::int AS "wrong",
        COUNT(*)::int                                   AS "total"
      FROM "AttemptAnswer" aa
      JOIN "Attempt"  a ON a."id" = aa."attemptId"
      JOIN "Question" q ON q."id" = aa."questionId"
      JOIN "Topic"    t ON t."id" = q."topicId"
      WHERE a."groupId" = ${groupId}
        AND a."mode" = 'EXAM'
        AND a."finishedAt" IS NOT NULL
      GROUP BY q."id", q."text", t."name"
      HAVING COUNT(*) >= ${MIN_ANSWERS_FOR_RANKING}::int
      -- Foiz teng bo'lsa ko'proq javob bo'lgani ustun — ishonchliroq
      -- ma'lumot. Ilgari bu izoh bor edi, lekin saralashda amalga
      -- oshirilmagan edi.
      ORDER BY
        (COUNT(*) FILTER (WHERE NOT aa."isCorrect"))::numeric / COUNT(*) DESC,
        COUNT(*) DESC
      LIMIT ${missedLimit}
    `,
  ]);

  // Mavzular soni o'nlab, shuning uchun saralash Node'da — ko'rsatiladigan
  // (yaxlitlangan) foiz bo'yicha saralanadi, ya'ni jadval tartibi ekrandagi
  // raqamlarga aynan mos keladi.
  const topicErrorRates: TopicErrorRate[] = topicRows
    .map((row) => ({
      topicId: row.topicId,
      topicName: row.topicName,
      errorRatePercent: Math.round(((row.total - row.correct) / row.total) * 100),
    }))
    .sort((a, b) => b.errorRatePercent - a.errorRatePercent);

  const mostMissedQuestions: MissedQuestion[] = questionRows.map((row) => ({
    questionId: row.questionId,
    questionText: row.questionText,
    topicName: row.topicName,
    missPercent: Math.round((row.wrong / row.total) * 100),
  }));

  return { topicErrorRates, mostMissedQuestions };
}

/**
 * Guruhdagi har bir o'quvchi bo'yicha urinishlar, o'rtacha ball va holat.
 * O'rtacha ball va holat FAQAT imtihon (EXAM) urinishlaridan hisoblanadi —
 * mashqda javob darhol ko'rsatilgani uchun mashq ballari sun'iy yuqori
 * bo'ladi va aralashtirilsa ustozga noto'g'ri manzara beradi. Oxirgi
 * faollik esa ikkala rejimni ham hisobga oladi (haqiqiy faollik ko'rsatkichi).
 *
 * Urinishlar `Attempt.groupId` bo'yicha filtrlanadi — o'quvchining hozirgi
 * guruhi bo'yicha emas. Ilgari bu filtr yo'q edi va boshqa guruhdan
 * ko'chirilgan o'quvchining eski imtihonlari yangi ustozning JADVALIDA
 * ko'rinardi, lekin o'sha ustozning "so'nggi hafta" plitkasiga ham, mavzu
 * diagrammasiga ham kirmasdi (ular allaqachon groupId bo'yicha ishlardi) —
 * bitta ekranda to'rt raqamdan ikkitasi bir qoidada, ikkitasi boshqasida
 * edi. Ko'chirilgan o'quvchining eski natijalari eski ustozda qolishi
 * kerak, aks holda yangi ustoz o'zi qilmagan ish uchun baholanadi.
 */
export async function getRosterForGroup(groupId: string): Promise<RosterEntry[]> {
  const profiles = await prisma.studentProfile.findMany({
    where: { groupId },
    select: { userId: true, user: { select: { name: true, isActive: true } } },
  });
  if (profiles.length === 0) return [];

  const studentIds = profiles.map((p) => p.userId);
  const attempts = await prisma.attempt.findMany({
    // `groupId` — asosiy filtr; `studentId in` esa guruhni tark etgan
    // (boshqa guruhga ko'chirilgan) o'quvchining shu guruhda qoldirgan
    // urinishlarini keraksiz tortmaslik uchun.
    where: { groupId, studentId: { in: studentIds } },
    orderBy: { startedAt: "desc" },
    select: { studentId: true, startedAt: true, finishedAt: true, score: true, mode: true },
  });

  const attemptsByStudent = new Map<string, typeof attempts>();
  for (const a of attempts) {
    const list = attemptsByStudent.get(a.studentId) ?? [];
    list.push(a);
    attemptsByStudent.set(a.studentId, list);
  }

  return profiles.map((p) => {
    const studentAttempts = attemptsByStudent.get(p.userId) ?? [];
    // Faqat YAKUNLANGAN urinishlar sanaladi — tashlab ketilgani (score null)
    // o'rtacha ballga ham kirmaydi, shuning uchun uni ustunda ko'rsatish
    // "5 imtihon · Imtihon topshirilmagan" kabi o'zaro zid qator hosil qilardi.
    const examAttempts = studentAttempts.filter(
      (a) => a.mode === "EXAM" && a.finishedAt !== null
    );
    const practiceAttempts = studentAttempts.filter(
      (a) => a.mode === "PRACTICE" && a.finishedAt !== null
    );
    const finishedExamScores = examAttempts
      .filter((a) => a.score !== null)
      .map((a) => a.score as number);
    const averageScore =
      finishedExamScores.length > 0
        ? Math.round(
            finishedExamScores.reduce((sum, s) => sum + s, 0) / finishedExamScores.length
          )
        : null;
    // Eng so'nggi faollik — SHU GURUHDAGI barcha urinishlarning ham
    // boshlanish, ham yakunlanish vaqtlari ichidan eng kattasi.
    //
    // Guruh filtri bu ustunga ham qo'llanadi (yuqoridagi so'rov orqali):
    // ustun jadvalning qolgan uchta ustuni bilan bitta qatorda turadi va
    // ular endi "shu guruhdagi faollik"ni ko'rsatadi. Aks holda "0 imtihon,
    // 0 mashq, lekin kecha faol" degan tushunarsiz qator chiqardi. Boshqa
    // guruhga ko'chirilgan o'quvchining faolligini yangi ustozi ko'radi,
    // eskisi emas.
    //
    // Faqat `[0]` ni olish
    // noto'g'ri edi: ro'yxat startedAt bo'yicha saralangani uchun keyinroq
    // yakunlangan eski urinish e'tibordan chetda qolib, ko'rsatilgan vaqt
    // orqaga siljib ketishi mumkin edi.
    const activityTimes = studentAttempts.flatMap((a) =>
      a.finishedAt ? [a.startedAt.getTime(), a.finishedAt.getTime()] : [a.startedAt.getTime()]
    );
    const lastActivityAt =
      activityTimes.length > 0 ? new Date(Math.max(...activityTimes)) : null;

    return {
      studentId: p.userId,
      name: p.user.name,
      isActive: p.user.isActive,
      examAttemptCount: examAttempts.length,
      practiceAttemptCount: practiceAttempts.length,
      lastActivityAt,
      averageScore,
      status: readinessFromScore(averageScore),
    };
  });
}

/**
 * O'quvchi va uning guruhi haqida ruxsat tekshiruvi (canViewStudent) uchun
 * yetarli minimal ma'lumot. O'quvchi topilmasa null qaytadi.
 */
export async function getStudentGroupContext(
  studentId: string
): Promise<StudentGroupContext | null> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
    select: {
      userId: true,
      user: { select: { organizationId: true } },
      group: { select: { tutorId: true, organizationId: true } },
    },
  });
  if (!profile) return null;

  return {
    student: { userId: profile.userId, organizationId: profile.user.organizationId },
    group: { tutorId: profile.group.tutorId, organizationId: profile.group.organizationId },
  };
}

/**
 * O'quvchining mavzular bo'yicha o'zlashtirishi (eng zaif mavzu birinchi)
 * va yakunlangan urinishlar tarixi.
 *
 * Mavzu foizi o'quvchining O'Z panelidagi bilan bitta funksiyadan
 * (`getMasteryByTopic`) olinadi. Ilgari bu yerda alohida, Node'da
 * hisoblanadigan nusxa turardi va u boshqa qoidada ishlardi (mashqlarni ham
 * qo'shardi, javobsizni ko'rmasdi) — natijada ustoz bilan o'quvchi bir xil
 * mavzu uchun boshqa-boshqa foiz ko'rardi. Endi manba bitta: yakunlangan
 * imtihonlar, javobsiz savol xato deb sanaladi.
 */
export async function getStudentDetailForTutor(
  studentId: string
): Promise<StudentDetail | null> {
  const user = await prisma.user.findUnique({
    where: { id: studentId },
    select: { name: true },
  });
  if (!user) return null;

  const [masteryByTopic, attemptRows] = await Promise.all([
    // FAQAT o'quvchi imtihonda uchratgan mavzular chiqadi (getMasteryByTopic
    // shunday ishlaydi). Ilgari barcha mavzular olinib, ma'lumot yo'qlari 0%
    // deb belgilanardi va ro'yxat o'sish bo'yicha saralangani uchun "hech
    // urinilmagan" mavzular "eng zaif" bo'lib ro'yxat boshini to'ldirib
    // tashlardi — ustoz haqiqiy zaif mavzuni ko'rmay qolardi.
    getMasteryByTopic(studentId),
    // Tarix esa ataylab IKKALA rejimni ham ko'rsatadi (har qatorda "Imtihon"
    // yoki "Mashq" belgisi bor) — bu statistika emas, faollik jurnali.
    prisma.attempt.findMany({
      where: { studentId, finishedAt: { not: null } },
      orderBy: { finishedAt: "desc" },
      select: { id: true, finishedAt: true, score: true, mode: true },
    }),
  ]);

  const attempts = attemptRows.map((a) => ({
    id: a.id,
    date: (a.finishedAt as Date).toISOString(),
    score: a.score,
    mode: a.mode,
  }));

  return { name: user.name, masteryByTopic, attempts };
}
