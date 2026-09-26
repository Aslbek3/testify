import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { Role } from "@prisma/client";
import type { SessionUser } from "../src/types/auth";
import { NO_ORGANIZATION_SWITCHES } from "../src/types/auth";
import {
  canManageGroup,
  canViewGroup,
  canCreateStudent,
  canManageStudent,
  canManageAssignment,
  canManageLesson,
  canSaveQuestion,
  canReportQuestion,
  canReviewQuestionReports,
  canManageQuestionBank,
} from "../src/lib/permissions";

/**
 * Ruxsatlar matritsasi — bu fayl butun ilovaning xavfsizlik chegarasi.
 *
 * Nega birlik testi aynan shu yerda eng qimmat: funksiyalar SOF va
 * SINXRON (bazaga bormaydi), ya'ni ularni millisekundda tekshirish
 * mumkin. HTTP tekshiruvi esa server va bazani talab qiladi va faqat
 * bir nechta holatni ko'radi. Bu yerda esa har bir rol × har bir amal
 * kombinatsiyasi yoziladi.
 *
 * `docs/rollar.md` dagi jadval bilan mos bo'lishi shart.
 */
const ORG = "org-1";
const OTHER_ORG = "org-2";
const TUTOR_ID = "tutor-1";

function user(role: Role, organizationId: string | null = ORG): SessionUser {
  return {
    id: role === "TUTOR" ? TUTOR_ID : `${role.toLowerCase()}-1`,
    role,
    organizationId,
    sessionVersion: 1,
    switches: NO_ORGANIZATION_SWITCHES,
  };
}

const group = { organizationId: ORG, tutorId: TUTOR_ID };
const foreignGroup = { organizationId: OTHER_ORG, tutorId: "tutor-9" };

describe("Guruhni boshqarish", () => {
  test("direktor o'z tashkilotining guruhini boshqaradi", () => {
    assert.equal(canManageGroup(user("DIRECTOR"), group), true);
  });

  test("direktor BEGONA tashkilot guruhini boshqara olmaydi", () => {
    assert.equal(canManageGroup(user("DIRECTOR"), foreignGroup), false);
  });

  test("ustoz o'z guruhini ham boshqara olmaydi — bu direktorning ishi", () => {
    assert.equal(canManageGroup(user("TUTOR"), group), false);
  });

  test("qabulxona guruhni ko'radi, lekin boshqarmaydi", () => {
    assert.equal(canViewGroup(user("RECEPTION"), group), true);
    assert.equal(canManageGroup(user("RECEPTION"), group), false);
  });

  test("o'quvchi boshqa guruhni ko'ra olmaydi", () => {
    assert.equal(canViewGroup(user("STUDENT"), foreignGroup), false);
  });
});

describe("Vazifa va dars — ataylab boshqacha chegara", () => {
  test("vazifani FAQAT guruh ustozi beradi", () => {
    assert.equal(canManageAssignment(user("TUTOR"), group), true);
    assert.equal(canManageAssignment(user("DIRECTOR"), group), false);
  });

  test("dars jadvalini ustoz ham, direktor ham tuzadi", () => {
    assert.equal(canManageLesson(user("TUTOR"), group), true);
    assert.equal(canManageLesson(user("DIRECTOR"), group), true);
  });

  test("begona guruhning ustozi dars jadvaliga tegmaydi", () => {
    assert.equal(canManageLesson(user("TUTOR"), foreignGroup), false);
  });

  test("qabulxona ikkalasiga ham tegmaydi", () => {
    assert.equal(canManageAssignment(user("RECEPTION"), group), false);
    assert.equal(canManageLesson(user("RECEPTION"), group), false);
  });
});

describe("Kalitlar (switches) o'chiq holatda", () => {
  test("ustoz standart holatda o'quvchi qo'sha olmaydi", () => {
    assert.equal(canCreateStudent(user("TUTOR"), group), false);
  });

  test("kalit yoqilsa — qo'sha oladi", () => {
    const tutor = user("TUTOR");
    tutor.switches = { ...NO_ORGANIZATION_SWITCHES, tutorManagesStudents: true };
    assert.equal(canCreateStudent(tutor, group), true);
    assert.equal(canManageStudent(tutor, group), true);
  });

  test("kalit yoqilsa ham BEGONA guruhga tegmaydi", () => {
    const tutor = user("TUTOR");
    tutor.switches = { ...NO_ORGANIZATION_SWITCHES, tutorManagesStudents: true };
    assert.equal(canCreateStudent(tutor, foreignGroup), false);
  });
});

describe("Savol: saqlash, shikoyat, ko'rib chiqish", () => {
  test("xatcho'p — faqat o'quvchi", () => {
    assert.equal(canSaveQuestion(user("STUDENT")), true);
    assert.equal(canSaveQuestion(user("TUTOR")), false);
    assert.equal(canSaveQuestion(user("RECEPTION")), false);
  });

  test("shikoyat — o'quvchi va ustoz", () => {
    assert.equal(canReportQuestion(user("STUDENT")), true);
    assert.equal(canReportQuestion(user("TUTOR")), true);
    assert.equal(canReportQuestion(user("DIRECTOR")), false);
  });

  test("shikoyatni yopish va savollar bazasi — faqat owner", () => {
    const owner = user("OWNER", null);
    assert.equal(canReviewQuestionReports(owner), true);
    assert.equal(canManageQuestionBank(owner), true);
    assert.equal(canReviewQuestionReports(user("DIRECTOR")), false);
    assert.equal(canManageQuestionBank(user("TUTOR")), false);
  });
});
