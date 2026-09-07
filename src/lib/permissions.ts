import type { SessionUser } from "@/types/auth";

type GroupRef = { tutorId: string; organizationId: string };
type StudentRef = { userId: string; organizationId: string | null };
type AttemptRef = { studentId: string };

export function isOwner(user: SessionUser): boolean {
  return user.role === "OWNER";
}

export function isDirector(user: SessionUser): boolean {
  return user.role === "DIRECTOR";
}

export function isTutor(user: SessionUser): boolean {
  return user.role === "TUTOR";
}

export function isStudent(user: SessionUser): boolean {
  return user.role === "STUDENT";
}

/** Faqat App Owner tashkilotlarni yarata/tahrirlay oladi. */
export function canManageOrganizations(user: SessionUser): boolean {
  return isOwner(user);
}

/** Faqat App Owner savollar bazasini (mavzular/savollar) boshqara oladi. */
export function canManageQuestionBank(user: SessionUser): boolean {
  return isOwner(user);
}

/** Owner har qanday tashkilotni, Direktor faqat o'zinikini ko'ra oladi. */
export function canViewOrganization(
  user: SessionUser,
  organizationId: string
): boolean {
  if (isOwner(user)) return true;
  return isDirector(user) && user.organizationId === organizationId;
}

/** Guruhni boshqarish (yaratish/tahrirlash): Owner yoki shu tashkilot Direktori. */
export function canManageGroup(user: SessionUser, group: GroupRef): boolean {
  if (isOwner(user)) return true;
  return isDirector(user) && user.organizationId === group.organizationId;
}

/** Guruhni ko'rish: yuqoridagilar + guruh egasi bo'lgan Ustoz. */
export function canViewGroup(user: SessionUser, group: GroupRef): boolean {
  if (canManageGroup(user, group)) return true;
  return isTutor(user) && user.id === group.tutorId;
}

/**
 * O'quvchi profilini ko'rish: Owner, shu tashkilot Direktori,
 * o'quvchining guruhi egasi bo'lgan Ustoz, yoki o'zi.
 */
export function canViewStudent(
  user: SessionUser,
  student: StudentRef,
  group?: GroupRef
): boolean {
  if (isOwner(user)) return true;
  if (isStudent(user)) return user.id === student.userId;
  if (isDirector(user)) return user.organizationId === student.organizationId;
  if (isTutor(user) && group) return user.id === group.tutorId;
  return false;
}

/**
 * O'quvchi hisobini boshqarish (bloklash/tiklash, parolni tiklash): shu
 * o'quvchi guruhi egasi bo'lgan Ustoz, YOKI shu tashkilotning istalgan
 * o'quvchisi uchun Direktor (guruhidan qat'iy nazar).
 */
export function canManageStudent(user: SessionUser, group: GroupRef): boolean {
  if (isDirector(user)) {
    return user.organizationId !== null && user.organizationId === group.organizationId;
  }
  return isTutor(user) && user.id === group.tutorId;
}

/**
 * O'quvchini bir guruhdan boshqasiga ko'chirish: Direktor o'z tashkiloti
 * ICHIDA istalgan guruhga (o'quvchi va maqsad guruh ikkalasi ham direktor
 * tashkilotiga tegishli bo'lishi kerak); Ustoz esa faqat o'ZINING
 * guruhiga (ya'ni ustoz uchun bu amaliyotda "guruh o'zgartirish" emas,
 * faqat o'z guruhiga qo'shish degani — RosterTable'da bu imkoniyat
 * ataylab ko'rsatilmaydi).
 */
export function canAssignStudentToGroup(
  user: SessionUser,
  student: StudentRef,
  targetGroup: GroupRef
): boolean {
  if (isDirector(user)) {
    return (
      user.organizationId !== null &&
      user.organizationId === student.organizationId &&
      user.organizationId === targetGroup.organizationId
    );
  }
  return isTutor(user) && user.id === targetGroup.tutorId;
}

/**
 * Ustoz hisobini boshqarish (bloklash/tiklash, parolni tiklash): shu
 * ustoz tegishli bo'lgan tashkilot Direktori.
 */
export function canManageTutor(
  user: SessionUser,
  tutor: { organizationId: string | null }
): boolean {
  return isDirector(user) && user.organizationId !== null && user.organizationId === tutor.organizationId;
}

/**
 * Test urinishini boshqarish (javob berish/yakunlash): FAQAT shu urinish
 * egasi bo'lgan o'quvchining o'zi — Owner/Director/Tutor ham emas, chunki
 * bu boshqaruv emas, imtihon topshirishning o'zi.
 */
export function canTakeAttempt(user: SessionUser, attempt: AttemptRef): boolean {
  return isStudent(user) && user.id === attempt.studentId;
}
