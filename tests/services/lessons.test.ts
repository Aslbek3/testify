import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { UZBEKISTAN_UTC_OFFSET_HOURS } from "@/lib/format";
import {
  createLessonSeries,
  deleteLesson,
  deleteUpcomingLessons,
  getLessonGroupRef,
  getNextLessonForStudent,
  listLessonsForGroup,
  listPastLessonsForGroup,
  listTodayLessons,
  uzDayStart,
  LessonError,
  MAX_LESSONS_PER_SERIES,
  MAX_WEEKS,
  MIN_DURATION_MIN,
  MAX_DURATION_MIN,
} from "@/services/lessons";
import { createFixture, cleanupFixture, disconnect, type Fixture } from "./fixture";

/**
 * Dars jadvali tuzish.
 *
 * Nega bu servis qoplanishi kerak: `createLessonSeries` bitta chaqiruvda
 * o'nlab yozuv yaratadi va hafta kunini O'ZBEKISTON vaqti bo'yicha
 * hisoblaydi (`getUTCDay` siljitilgan lahzadan). Server vaqt mintaqasi
 * boshqa bo'lsa dushanba yakshanbaga surilib ketishi mumkin, va buni
 * ko'z bilan tekshirish qiyin — jadval "deyarli to'g'ri" ko'rinadi.
 *
 * Chegaralar ham shu yerda: ular foydalanuvchiga ko'rinadigan xato
 * matnlari, ya'ni ularning o'zi ham shartnoma.
 */

const OFFSET_MS = UZBEKISTAN_UTC_OFFSET_HOURS * 60 * 60 * 1000;

let fixture: Fixture;

before(async () => {
  fixture = await createFixture("lessons");
});

after(async () => {
  await cleanupFixture(fixture);
  await disconnect();
});

// Har testdan keyin emas, OLDIN tozalanadi: test yiqilsa bazada nima
// qolganini ko'rish mumkin bo'lsin, lekin keyingi test toza boshlansin.
beforeEach(async () => {
  await prisma.lesson.deleteMany({ where: { groupId: fixture.group.id } });
});

/** ISO hafta kuni (1 = dushanba … 7 = yakshanba) O'zbekiston vaqti bo'yicha. */
function uzWeekday(at: Date): number {
  const day = new Date(at.getTime() + OFFSET_MS).getUTCDay();
  return day === 0 ? 7 : day;
}

/** Soat va daqiqa O'zbekiston vaqti bo'yicha. */
function uzTime(at: Date): { hour: number; minute: number } {
  const shifted = new Date(at.getTime() + OFFSET_MS);
  return { hour: shifted.getUTCHours(), minute: shifted.getUTCMinutes() };
}

/** Kelajakdagi aniq dushanba — natija kalendarga bog'liq bo'lmasin. */
const MONDAY = new Date("2027-03-01T00:00:00Z");

function seriesInput(overrides: Partial<Parameters<typeof createLessonSeries>[0]> = {}) {
  return {
    groupId: fixture.group.id,
    createdById: fixture.tutor.id,
    weekdays: [1, 3],
    hour: 14,
    minute: 30,
    durationMin: 90,
    weeks: 8,
    startFrom: MONDAY,
    ...overrides,
  };
}

describe("createLessonSeries — hafta kunlari", () => {
  test("ikki kun × 8 hafta = 16 ta dars", async () => {
    const { created } = await createLessonSeries(seriesInput());
    assert.equal(created, 16);

    const rows = await prisma.lesson.findMany({
      where: { groupId: fixture.group.id },
      select: { startsAt: true },
      orderBy: { startsAt: "asc" },
    });
    assert.equal(rows.length, 16);
    // Har bir dars AYNAN tanlangan kunda va tanlangan soatda.
    for (const row of rows) {
      assert.ok([1, 3].includes(uzWeekday(row.startsAt)), `kun: ${row.startsAt.toISOString()}`);
      assert.deepEqual(uzTime(row.startsAt), { hour: 14, minute: 30 });
    }
    // Dushanba va chorshanba teng miqdorda.
    assert.equal(rows.filter((r) => uzWeekday(r.startsAt) === 1).length, 8);
    assert.equal(rows.filter((r) => uzWeekday(r.startsAt) === 3).length, 8);
  });

  test("yakshanba (7) ham to'g'ri tushunadi — ISO va getUTCDay farqi", async () => {
    const { created } = await createLessonSeries(
      seriesInput({ weekdays: [7], weeks: 3 })
    );
    assert.equal(created, 3);

    const rows = await prisma.lesson.findMany({
      where: { groupId: fixture.group.id },
      select: { startsAt: true },
    });
    for (const row of rows) {
      assert.equal(uzWeekday(row.startsAt), 7);
    }
  });

  test("birinchi dars startFrom kunining O'ZIDA bo'lishi mumkin", async () => {
    const { created } = await createLessonSeries(
      seriesInput({ weekdays: [1], weeks: 1 })
    );
    assert.equal(created, 1);

    const first = await prisma.lesson.findFirstOrThrow({
      where: { groupId: fixture.group.id },
      select: { startsAt: true },
    });
    assert.equal(
      first.startsAt.getTime(),
      uzDayStart(MONDAY.getTime()).getTime() + (14 * 60 + 30) * 60 * 1000
    );
  });

  test("mavzu va izoh saqlanadi", async () => {
    await createLessonSeries(
      seriesInput({
        weekdays: [2],
        weeks: 1,
        topicId: fixture.topic.id,
        note: "nazorat ishi",
      })
    );
    const row = await prisma.lesson.findFirstOrThrow({
      where: { groupId: fixture.group.id },
      select: { topicId: true, note: true, durationMin: true, createdById: true },
    });
    assert.equal(row.topicId, fixture.topic.id);
    assert.equal(row.note, "nazorat ishi");
    assert.equal(row.durationMin, 90);
    assert.equal(row.createdById, fixture.tutor.id);
  });
});

describe("createLessonSeries — chegaralar", () => {
  /** Xato chiqishi VA hech narsa yozilmasligi — ikkisi birga tekshiriladi. */
  async function rejects(
    input: Parameters<typeof createLessonSeries>[0],
    messagePart: string
  ) {
    await assert.rejects(
      () => createLessonSeries(input),
      (error: unknown) => {
        assert.ok(error instanceof LessonError, "LessonError bo'lishi kerak");
        assert.match(error.message, new RegExp(messagePart));
        assert.equal(error.status, 400);
        return true;
      }
    );
    assert.equal(
      await prisma.lesson.count({ where: { groupId: fixture.group.id } }),
      0,
      "xato bo'lganda birorta dars yozilmasligi kerak"
    );
  }

  test("kun tanlanmagan", async () => {
    await rejects(seriesInput({ weekdays: [] }), "Kamida bitta kun");
  });

  test("hafta kuni 0 yoki 8 — ro'yxatda yo'q", async () => {
    await rejects(seriesInput({ weekdays: [0] }), "Hafta kuni");
    await rejects(seriesInput({ weekdays: [1, 8] }), "Hafta kuni");
  });

  test("soat yoki daqiqa chegaradan tashqarida", async () => {
    await rejects(seriesInput({ hour: 24 }), "Vaqt");
    await rejects(seriesInput({ hour: -1 }), "Vaqt");
    await rejects(seriesInput({ minute: 60 }), "Vaqt");
  });

  test("davomiylik chegarasi", async () => {
    await rejects(seriesInput({ durationMin: MIN_DURATION_MIN - 1 }), "Davomiyligi");
    await rejects(seriesInput({ durationMin: MAX_DURATION_MIN + 1 }), "Davomiyligi");
  });

  test("hafta soni chegarasi", async () => {
    await rejects(seriesInput({ weeks: 0 }), "Hafta soni");
    await rejects(seriesInput({ weeks: MAX_WEEKS + 1 }), "Hafta soni");
  });

  test("bir marta yaratiladigan dars soni chegarasi", async () => {
    // Haftaning yetti kuni × 9 hafta = 63 ta, ya'ni 60 dan ko'p.
    await rejects(
      seriesInput({ weekdays: [1, 2, 3, 4, 5, 6, 7], weeks: 9 }),
      String(MAX_LESSONS_PER_SERIES)
    );
  });

  test("chegara ICHIDAGI eng katta to'plam o'tadi", async () => {
    // 7 kun × 8 hafta = 56 ta — 60 dan kam.
    const { created } = await createLessonSeries(
      seriesInput({ weekdays: [1, 2, 3, 4, 5, 6, 7], weeks: 8 })
    );
    assert.equal(created, 56);
  });

  test("ikki marta chaqirilsa IKKI nusxa chiqadi — bu ataylab shunday", async () => {
    // Servis mavjud darslarni tekshirmaydi (izohda yozilgan). Agar bu
    // kelajakda o'zgarsa, shu test yiqiladi va qaror ongli bo'ladi.
    await createLessonSeries(seriesInput({ weekdays: [1], weeks: 2 }));
    await createLessonSeries(seriesInput({ weekdays: [1], weeks: 2 }));
    assert.equal(await prisma.lesson.count({ where: { groupId: fixture.group.id } }), 4);
  });
});

describe("Darslarni o'qish va o'chirish", () => {
  test("listLessonsForGroup standart holatda faqat bugundan keyingisini beradi", async () => {
    await createLessonSeries(seriesInput({ weekdays: [1], weeks: 2 }));
    // O'tgan haftadagi dars — standart ro'yxatga tushmasligi kerak.
    await prisma.lesson.create({
      data: {
        groupId: fixture.group.id,
        createdById: fixture.tutor.id,
        startsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        durationMin: 90,
      },
    });

    const upcoming = await listLessonsForGroup(fixture.group.id);
    assert.equal(upcoming.length, 2);
    assert.equal(upcoming[0].groupName, fixture.group.name);
    assert.equal(upcoming[0].topicName, null);

    // `from` berilsa o'tgan dars ham ko'rinadi.
    const all = await listLessonsForGroup(fixture.group.id, {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });
    assert.equal(all.length, 3);
  });

  test("deleteUpcomingLessons faqat kelajakdagini o'chiradi", async () => {
    await createLessonSeries(seriesInput({ weekdays: [1], weeks: 3 }));
    const past = await prisma.lesson.create({
      data: {
        groupId: fixture.group.id,
        createdById: fixture.tutor.id,
        startsAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        durationMin: 90,
      },
      select: { id: true },
    });

    const { deleted } = await deleteUpcomingLessons(fixture.group.id);
    assert.equal(deleted, 3);
    const left = await prisma.lesson.findMany({
      where: { groupId: fixture.group.id },
      select: { id: true },
    });
    assert.deepEqual(left, [{ id: past.id }]);
  });

  test("listPastLessonsForGroup eng yaqin o'tgan darsni birinchi beradi", async () => {
    const day = 24 * 60 * 60 * 1000;
    for (const daysAgo of [2, 10, 30]) {
      await prisma.lesson.create({
        data: {
          groupId: fixture.group.id,
          createdById: fixture.tutor.id,
          startsAt: new Date(Date.now() - daysAgo * day),
          durationMin: 90,
          note: `${daysAgo} kun oldin`,
        },
      });
    }
    // Kelajakdagi dars o'tganlar ro'yxatiga tushmasligi kerak.
    await createLessonSeries(seriesInput({ weekdays: [1], weeks: 1 }));

    const past = await listPastLessonsForGroup(fixture.group.id);
    assert.deepEqual(
      past.map((row) => row.note),
      ["2 kun oldin", "10 kun oldin", "30 kun oldin"]
    );
    assert.equal((await listPastLessonsForGroup(fixture.group.id, 2)).length, 2);
  });

  test("getNextLessonForStudent hozirdan keyingi darsni beradi", async () => {
    const hour = 60 * 60 * 1000;
    await prisma.lesson.create({
      data: {
        groupId: fixture.group.id,
        createdById: fixture.tutor.id,
        startsAt: new Date(Date.now() - 2 * hour),
        durationMin: 90,
        note: "o'tib ketgan",
      },
    });
    await prisma.lesson.create({
      data: {
        groupId: fixture.group.id,
        createdById: fixture.tutor.id,
        startsAt: new Date(Date.now() + 2 * hour),
        durationMin: 90,
        note: "keyingi",
      },
    });

    const next = await getNextLessonForStudent(fixture.student.id);
    assert.equal(next?.note, "keyingi");

    // Profili yo'q foydalanuvchi (masalan ustoz) — xato emas, shunchaki null.
    assert.equal(await getNextLessonForStudent(fixture.tutor.id), null);
  });

  test("deleteLesson yo'q darsga 404 beradi", async () => {
    await assert.rejects(
      () => deleteLesson("yoq-dars-id"),
      (error: unknown) => error instanceof LessonError && error.status === 404
    );
  });

  test("getLessonGroupRef ruxsat tekshiruvi uchun guruhni qaytaradi", async () => {
    await createLessonSeries(seriesInput({ weekdays: [1], weeks: 1 }));
    const lesson = await prisma.lesson.findFirstOrThrow({
      where: { groupId: fixture.group.id },
      select: { id: true },
    });

    const ref = await getLessonGroupRef(lesson.id);
    assert.deepEqual(ref, {
      lessonId: lesson.id,
      groupId: fixture.group.id,
      group: { tutorId: fixture.tutor.id, organizationId: fixture.organization.id },
    });
    assert.equal(await getLessonGroupRef("yoq-dars-id"), null);
  });

  test("listTodayLessons qamrovsiz chaqirilsa xato beradi", async () => {
    // Nega xato: qamrovsiz so'rov BUTUN bazaning bugungi darslarini
    // qaytarardi, ya'ni boshqa avtomaktabning jadvalini ham.
    await assert.rejects(
      () => listTodayLessons({}),
      (error: unknown) => error instanceof LessonError && error.status === 400
    );
  });

  test("listTodayLessons ustoz qamrovida bugungi darsni topadi", async () => {
    const todayAt = new Date(uzDayStart().getTime() + 10 * 60 * 60 * 1000);
    await prisma.lesson.create({
      data: {
        groupId: fixture.group.id,
        createdById: fixture.tutor.id,
        startsAt: todayAt,
        durationMin: 90,
        note: "bugungi",
      },
    });

    const rows = await listTodayLessons({ tutorId: fixture.tutor.id });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].note, "bugungi");

    // Tashkilot qamrovi ham xuddi shu darsni ko'radi.
    const orgRows = await listTodayLessons({
      organizationId: fixture.organization.id,
    });
    assert.equal(orgRows.length, 1);
  });
});

describe("uzDayStart — sof funksiya", () => {
  test("kun boshi O'zbekiston vaqti bo'yicha, server mintaqasidan qat'i nazar", () => {
    // 2027-03-01T22:00Z = 2027-03-02 03:00 O'zbekistonda, ya'ni kun
    // boshi 2027-03-01T19:00Z (= 2-mart 00:00 UZ).
    assert.equal(
      uzDayStart(Date.parse("2027-03-01T22:00:00Z")).getTime(),
      Date.parse("2027-03-01T19:00:00Z")
    );
    // 2027-03-01T03:00Z = o'sha kuni 08:00 UZ → kun boshi bir kun oldin.
    assert.equal(
      uzDayStart(Date.parse("2027-03-01T03:00:00Z")).getTime(),
      Date.parse("2027-02-28T19:00:00Z")
    );
  });
});
