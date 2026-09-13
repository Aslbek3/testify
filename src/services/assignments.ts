import type { AssignmentKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canTakeAssignment } from "@/lib/permissions";
import { QUESTION_COUNT } from "@/lib/examRules";
import {
  ASSIGNMENT_MAX_TARGET,
  ASSIGNMENT_NOTE_MAX_LENGTH,
  GROUP_OVERDUE_VISIBLE_DAYS,
  STUDENT_OVERDUE_VISIBLE_DAYS,
  describeAssignment,
  isAssignmentOverdue,
  parseAssignmentDueDate,
  validateAssignmentDueAt,
} from "@/lib/assignments";
import type { SessionUser } from "@/types/auth";
import { countAvailableQuestions, startAttempt } from "@/services/attempts";
import { getStudentGroupId } from "@/services/studentDashboard";

/**
 * Vazifa bilan bog'liq domen xatolari. API route va sahifalar `status`ni
 * to'g'ridan-to'g'ri ishlatadi.
 */
export class AssignmentError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const ASSIGNMENT_KINDS: AssignmentKind[] = ["EXAM", "PRACTICE"];

/** Mavzu ID'lari cheklovi — `/api/attempts` dagi bilan bir xil sabab. */
const MAX_TOPIC_IDS = 50;

const DAY_MS = 24 * 60 * 60 * 1000;

export function isAssignmentKind(value: unknown): value is AssignmentKind {
  return ASSIGNMENT_KINDS.includes(value as AssignmentKind);
}

export async function createAssignment(input: {
  groupId: string;
  createdById: string;
  kind: AssignmentKind;
  topicIds: string[];
  targetCount: number;
  dueDate: string;
  note: string;
}) {
  if (
    !Number.isInteger(input.targetCount) ||
    input.targetCount < 1 ||
    input.targetCount > ASSIGNMENT_MAX_TARGET
  ) {
    throw new AssignmentError(`Soni 1 dan ${ASSIGNMENT_MAX_TARGET} gacha bo'lishi kerak`);
  }

  const dueAt = parseAssignmentDueDate(input.dueDate);
  if (!dueAt) throw new AssignmentError("Muddat noto'g'ri");
  const dueError = validateAssignmentDueAt(dueAt);
  if (dueError) throw new AssignmentError(dueError);

  const note = input.note.trim();
  if (note.length > ASSIGNMENT_NOTE_MAX_LENGTH) {
    throw new AssignmentError(`Izoh ${ASSIGNMENT_NOTE_MAX_LENGTH} belgidan oshmasligi kerak`);
  }

  let topicIds: string[] = [];
  if (input.kind === "PRACTICE") {
    topicIds = [...new Set(input.topicIds)];
    if (topicIds.length === 0) {
      throw new AssignmentError("Kamida bitta mavzu tanlang");
    }
    if (topicIds.length > MAX_TOPIC_IDS) {
      throw new AssignmentError(`Mavzular soni ${MAX_TOPIC_IDS} tadan oshmasligi kerak`);
    }
    // Savolsiz mavzu ham rad etiladi: o'quvchi vazifani ocholmay
    // "savollar topilmadi" xatosiga urilgandagina bu ma'lum bo'lardi.
    const topicsWithQuestions = await prisma.topic.count({
      where: { id: { in: topicIds }, questions: { some: {} } },
    });
    if (topicsWithQuestions !== topicIds.length) {
      throw new AssignmentError("Tanlangan mavzulardan biri topilmadi yoki unda savol yo'q");
    }
  } else {
    // Imtihon butun bazadan tuziladi. Savollar yetmasa, o'quvchi uni
    // boshlay olmaydi — bajarib bo'lmaydigan vazifani berishga yo'l
    // qo'yilmaydi (`startAttempt` dagi shart bilan bir xil).
    if ((await countAvailableQuestions()) < QUESTION_COUNT.EXAM) {
      throw new AssignmentError(
        `Bazada imtihon uchun savollar yetarli emas (kamida ${QUESTION_COUNT.EXAM} ta kerak)`
      );
    }
  }

  return prisma.assignment.create({
    data: {
      groupId: input.groupId,
      createdById: input.createdById,
      kind: input.kind,
      topicIds,
      targetCount: input.targetCount,
      dueAt,
      note: note || null,
    },
    select: { id: true },
  });
}

/**
 * Ruxsat tekshiruvi (`canManageAssignment`) uchun minimal ma'lumot: vazifa
 * guruhining ustozi va tashkiloti. Topilmasa `null` — chaqiruvchi
 * "topilmadi" va "ruxsat yo'q" ni bir xil 404 bilan qaytaradi.
 */
export async function getAssignmentGroupRef(
  assignmentId: string
): Promise<{ tutorId: string; organizationId: string } | null> {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { group: { select: { tutorId: true, organizationId: true } } },
  });
  return assignment?.group ?? null;
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  // Bog'langan urinishlar o'chmaydi — `Attempt.assignmentId` SET NULL
  // bo'ladi (schema.prisma). Urinish o'quvchining natijasi, vazifaniki emas.
  await prisma.assignment.delete({ where: { id: assignmentId } });
}

// ---------------------------------------------------------------------------
// Bajarilganini hisoblash
// ---------------------------------------------------------------------------

type AssignmentRow = {
  id: string;
  kind: AssignmentKind;
  topicIds: string[];
  targetCount: number;
  dueAt: Date;
  note: string | null;
  createdAt: Date;
};

const ASSIGNMENT_SELECT = {
  id: true,
  kind: true,
  topicIds: true,
  targetCount: true,
  dueAt: true,
  note: true,
  createdAt: true,
} as const;

/**
 * Har bir vazifa bo'yicha har bir o'quvchi nechta urinishni sanatgan.
 *
 * Qoida:
 * - EXAM — vazifa berilgan paytdan muddatgacha YAKUNLANGAN istalgan
 *   imtihon. O'quvchi imtihonni "Imtihon" bo'limidan boshlasa ham sanaladi:
 *   u baribir aynan so'ralgan ishni qilgan.
 * - PRACTICE — faqat shu vazifa orqali boshlangan va muddatgacha
 *   yakunlangan mashq. Oddiy mashq mavzuni tanlamaydi, ya'ni u "shu
 *   mavzudan mashq" degan shartni bajarmaydi.
 *
 * Yakunlanmagan (tashlab ketilgan) urinish sanalmaydi — ustoz panelidagi
 * boshqa sonlar bilan bir xil qoida (`getRosterForGroup`).
 *
 * Bitta so'rov: guruhlar kichik (o'nlab o'quvchi), vazifa muddati esa
 * `ASSIGNMENT_MAX_DAYS_AHEAD` bilan cheklangan — qatorlar soni oz.
 */
async function countDoneByAssignment(
  assignments: AssignmentRow[],
  studentIds: string[]
): Promise<Map<string, Map<string, number>>> {
  const result = new Map<string, Map<string, number>>();
  if (assignments.length === 0 || studentIds.length === 0) return result;

  const since = new Date(Math.min(...assignments.map((a) => a.createdAt.getTime())));
  const attempts = await prisma.attempt.findMany({
    where: {
      studentId: { in: studentIds },
      finishedAt: { gte: since },
      OR: [{ mode: "EXAM" }, { assignmentId: { in: assignments.map((a) => a.id) } }],
    },
    select: { studentId: true, mode: true, finishedAt: true, assignmentId: true },
  });

  for (const assignment of assignments) {
    const perStudent = new Map<string, number>();
    for (const attempt of attempts) {
      const finishedAt = attempt.finishedAt as Date;
      if (finishedAt < assignment.createdAt || finishedAt > assignment.dueAt) continue;
      const counts =
        assignment.kind === "EXAM"
          ? attempt.mode === "EXAM"
          : attempt.assignmentId === assignment.id;
      if (!counts) continue;
      perStudent.set(attempt.studentId, (perStudent.get(attempt.studentId) ?? 0) + 1);
    }
    result.set(assignment.id, perStudent);
  }
  return result;
}

/** Vazifalardagi mavzu ID'laridan nomlar lug'ati — bitta so'rov bilan. */
async function loadTopicNames(assignments: AssignmentRow[]): Promise<Map<string, string>> {
  const ids = [...new Set(assignments.flatMap((a) => a.topicIds))];
  if (ids.length === 0) return new Map();
  const topics = await prisma.topic.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  return new Map(topics.map((t) => [t.id, t.name]));
}

/**
 * Faol vazifalar birinchi (muddati yaqini tepada), keyin muddati o'tganlar
 * (eng yangisi tepada) — ustoz ham, o'quvchi ham avval "hozir nima qilish
 * kerak" ni ko'radi.
 */
function sortForDisplay<T extends { dueAt: Date }>(items: T[], now: Date): T[] {
  const active = items
    .filter((a) => !isAssignmentOverdue(a.dueAt, now))
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  const overdue = items
    .filter((a) => isAssignmentOverdue(a.dueAt, now))
    .sort((a, b) => b.dueAt.getTime() - a.dueAt.getTime());
  return [...active, ...overdue];
}

export type AssignmentStudentProgress = {
  studentId: string;
  name: string;
  doneCount: number;
  isDone: boolean;
};

export type GroupAssignment = {
  id: string;
  title: string;
  note: string | null;
  targetCount: number;
  dueAt: Date;
  isOverdue: boolean;
  /** Vazifani to'liq bajargan o'quvchilar soni. */
  completedCount: number;
  students: AssignmentStudentProgress[];
};

/**
 * Guruh vazifalari va har bir o'quvchining holati — ustoz paneli va
 * direktorning guruh sahifasi uchun (ikkalasi AYNI funksiyadan, shuning
 * uchun bir xil son ko'radi).
 *
 * Faqat HOZIR guruhda turgan va bloklanmagan o'quvchilar sanaladi:
 * bloklangan o'quvchi hech narsa bajara olmaydi va "12 tadan 9 tasi"
 * degan hisobni bekorga pasaytirardi.
 */
export async function listAssignmentsForGroup(
  groupId: string,
  now: Date = new Date()
): Promise<GroupAssignment[]> {
  const [assignments, profiles] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        groupId,
        dueAt: { gte: new Date(now.getTime() - GROUP_OVERDUE_VISIBLE_DAYS * DAY_MS) },
      },
      select: ASSIGNMENT_SELECT,
    }),
    prisma.studentProfile.findMany({
      where: { groupId, user: { isActive: true } },
      select: { userId: true, user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const studentIds = profiles.map((p) => p.userId);
  const [doneMap, topicNames] = await Promise.all([
    countDoneByAssignment(assignments, studentIds),
    loadTopicNames(assignments),
  ]);

  return sortForDisplay(assignments, now).map((a) => {
    const perStudent = doneMap.get(a.id) ?? new Map<string, number>();
    const students = profiles.map((p) => {
      const doneCount = perStudent.get(p.userId) ?? 0;
      return {
        studentId: p.userId,
        name: p.user.name,
        doneCount,
        isDone: doneCount >= a.targetCount,
      };
    });
    return {
      id: a.id,
      title: describeAssignment(a.kind, a.targetCount, namesFor(a, topicNames)),
      note: a.note,
      targetCount: a.targetCount,
      dueAt: a.dueAt,
      isOverdue: isAssignmentOverdue(a.dueAt, now),
      completedCount: students.filter((s) => s.isDone).length,
      students,
    };
  });
}

export type StudentAssignment = {
  id: string;
  title: string;
  note: string | null;
  targetCount: number;
  doneCount: number;
  isDone: boolean;
  dueAt: Date;
  isOverdue: boolean;
};

/** O'quvchining o'z guruhidagi vazifalar va uning o'z holati. */
export async function listAssignmentsForStudent(
  studentId: string,
  now: Date = new Date()
): Promise<StudentAssignment[]> {
  const groupId = await getStudentGroupId(studentId);
  if (!groupId) return [];

  const assignments = await prisma.assignment.findMany({
    where: {
      groupId,
      dueAt: { gte: new Date(now.getTime() - STUDENT_OVERDUE_VISIBLE_DAYS * DAY_MS) },
    },
    select: ASSIGNMENT_SELECT,
  });
  const [doneMap, topicNames] = await Promise.all([
    countDoneByAssignment(assignments, [studentId]),
    loadTopicNames(assignments),
  ]);

  return sortForDisplay(assignments, now).map((a) => {
    const doneCount = doneMap.get(a.id)?.get(studentId) ?? 0;
    return {
      id: a.id,
      title: describeAssignment(a.kind, a.targetCount, namesFor(a, topicNames)),
      note: a.note,
      targetCount: a.targetCount,
      doneCount,
      isDone: doneCount >= a.targetCount,
      dueAt: a.dueAt,
      isOverdue: isAssignmentOverdue(a.dueAt, now),
    };
  });
}

function namesFor(assignment: AssignmentRow, topicNames: Map<string, string>): string[] {
  return assignment.topicIds
    .map((id) => topicNames.get(id))
    .filter((name): name is string => name !== undefined);
}

/**
 * O'quvchi vazifadagi "Boshlash" tugmasini bosdi.
 *
 * Egalik (`canTakeAssignment`) va muddat SHU YERDA tekshiriladi — sahifa
 * havolasi `?vazifa=<id>` ni istalgan ID bilan qo'lda yozish mumkin.
 * Topilmadi va begona — bir xil 404.
 *
 * Vazifa to'liq bajarilgan bo'lsa ham boshlashga ruxsat beriladi: ortiqcha
 * mashq zarar qilmaydi, taqiqlash esa "yana bir marta" degan o'quvchini
 * oddiy mashq bo'limiga, mavzularni qo'lda qidirishga yuborardi.
 */
export async function startAssignmentAttempt(input: {
  user: SessionUser;
  assignmentId: string;
}): Promise<{ attemptId: string }> {
  const [assignment, studentGroupId] = await Promise.all([
    prisma.assignment.findUnique({
      where: { id: input.assignmentId },
      select: { id: true, groupId: true, kind: true, topicIds: true, dueAt: true },
    }),
    getStudentGroupId(input.user.id),
  ]);

  if (!assignment || !canTakeAssignment(input.user, assignment, studentGroupId)) {
    throw new AssignmentError("Vazifa topilmadi", 404);
  }
  if (isAssignmentOverdue(assignment.dueAt)) {
    throw new AssignmentError("Vazifa muddati o'tgan");
  }

  const started = await startAttempt({
    user: input.user,
    mode: assignment.kind,
    topicIds: assignment.kind === "PRACTICE" ? assignment.topicIds : undefined,
    groupId: studentGroupId,
    assignmentId: assignment.id,
  });
  return { attemptId: started.attemptId };
}
