import type { SessionUser } from "@/types/auth";

/**
 * Ruxsatlarning kodga aylantirilgan ko'rinishi. YAGONA manba —
 * `docs/rollar.md` dagi matritsa: avval o'sha hujjat o'zgaradi, keyin
 * shu fayl. Barcha funksiyalar SOF va SINXRON: bazaga murojaat yo'q,
 * kerakli kontekst (guruh, o'quvchi, tashkilot) chaqiruvchidan keladi.
 */

type GroupRef = { tutorId: string; organizationId: string };
type StudentRef = { userId: string; organizationId: string | null };
type AttemptRef = { studentId: string };
type StaffRef = { organizationId: string | null };

export function isOwner(user: SessionUser): boolean {
  return user.role === "OWNER";
}

export function isDirector(user: SessionUser): boolean {
  return user.role === "DIRECTOR";
}

/** Qabulxona xodimi — direktorning yordamchisi, o'rinbosari emas. */
export function isReception(user: SessionUser): boolean {
  return user.role === "RECEPTION";
}

export function isTutor(user: SessionUser): boolean {
  return user.role === "TUTOR";
}

export function isStudent(user: SessionUser): boolean {
  return user.role === "STUDENT";
}

/**
 * "Shu foydalanuvchi aynan shu tashkilotdami?" — tashkilotga bog'langan
 * har bir tekshiruvning asosi.
 *
 * `organizationId !== null` sharti MAJBURIY: aks holda tashkilotsiz
 * xodim tashkilotsiz o'quvchini "o'ziniki" deb ko'ra olardi
 * (`null === null`).
 */
function inOrganization(user: SessionUser, organizationId: string | null): boolean {
  return user.organizationId !== null && user.organizationId === organizationId;
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
  return isDirector(user) && inOrganization(user, organizationId);
}

/**
 * Tashkilot sozlamalari (shu jumladan rol kalitlari) — FAQAT direktor.
 * Qabulxona bu yerga hech qachon kirmaydi: kalitlarni o'zgartira
 * oladigan xodim o'ziga istalgan huquqni yozib olardi.
 */
export function canManageOrganizationSettings(
  user: SessionUser,
  organizationId: string
): boolean {
  return isDirector(user) && inOrganization(user, organizationId);
}

/**
 * Xodim (ustoz, qabulxona) yaratish, bloklash, parolini tiklash —
 * FAQAT shu tashkilot Direktori.
 *
 * Qabulxonaga ATAYLAB berilmagan (`docs/rollar.md`, o'zgarmas qoida 2):
 * aks holda qabulxona o'ziga teng huquqli ikkinchi hisob ochib, keyin
 * uni direktordan yashira olardi.
 */
export function canManageStaff(user: SessionUser, staff: StaffRef): boolean {
  return isDirector(user) && inOrganization(user, staff.organizationId);
}

/** Guruhni boshqarish (yaratish/tahrirlash/o'chirish): Owner yoki shu tashkilot Direktori. */
export function canManageGroup(user: SessionUser, group: GroupRef): boolean {
  if (isOwner(user)) return true;
  return isDirector(user) && inOrganization(user, group.organizationId);
}

/**
 * Guruhni ko'rish: yuqoridagilar + shu tashkilot qabulxonasi + guruh
 * egasi bo'lgan Ustoz. Qabulxona guruhlarni ko'radi, lekin yarata ham,
 * tahrirlay ham olmaydi (`canManageGroup`).
 */
export function canViewGroup(user: SessionUser, group: GroupRef): boolean {
  if (canManageGroup(user, group)) return true;
  if (isReception(user)) return inOrganization(user, group.organizationId);
  return isTutor(user) && user.id === group.tutorId;
}

/**
 * O'quvchi ro'yxatda/profilda ko'rinadimi: Owner, shu tashkilot
 * Direktori yoki Qabulxonasi, o'quvchining guruhi egasi bo'lgan Ustoz,
 * yoki o'zi.
 *
 * Bu — faqat "bor-yo'qligi va ma'muriy ma'lumoti". Natija va progress
 * alohida tekshiriladi (`canViewStudentProgress`).
 */
export function canViewStudent(
  user: SessionUser,
  student: StudentRef,
  group?: GroupRef
): boolean {
  if (isOwner(user)) return true;
  if (isStudent(user)) return user.id === student.userId;
  if (isDirector(user) || isReception(user)) {
    return inOrganization(user, student.organizationId);
  }
  if (isTutor(user) && group) return user.id === group.tutorId;
  return false;
}

/**
 * O'quvchining progressi, urinishlari va natijalarini ko'rish.
 *
 * `canViewStudent` dan farqi faqat qabulxonada: "Qabulxona natijalarni
 * ko'radi" kaliti o'chirilgan bo'lsa, u o'quvchini ro'yxatda ko'radi
 * (bu ma'muriy ish uchun shart), lekin ballari va urinishlarini emas.
 */
export function canViewStudentProgress(
  user: SessionUser,
  student: StudentRef,
  group?: GroupRef
): boolean {
  if (!canViewStudent(user, student, group)) return false;
  if (isReception(user)) return user.switches.receptionSeesProgress;
  return true;
}

/**
 * Guruhga yangi o'quvchi qo'shish: shu tashkilot Direktori yoki
 * Qabulxonasi, va kalit yoqilgan bo'lsa — guruh egasi bo'lgan Ustoz.
 *
 * Ustoz standart holatda qo'sha OLMAYDI (`tutorManagesStudents` —
 * o'chiq). Kalit qabulxonasi yo'q kichik avtomaktab uchun.
 */
export function canCreateStudent(user: SessionUser, group: GroupRef): boolean {
  if (isDirector(user) || isReception(user)) {
    return inOrganization(user, group.organizationId);
  }
  return (
    isTutor(user) && user.id === group.tutorId && user.switches.tutorManagesStudents
  );
}

/**
 * O'quvchi hisobini bloklash/tiklash: shu tashkilot Direktori yoki
 * Qabulxonasi (guruhidan qat'i nazar), va kalit yoqilgan bo'lsa — shu
 * o'quvchi guruhi egasi bo'lgan Ustoz.
 */
export function canManageStudent(user: SessionUser, group: GroupRef): boolean {
  if (isDirector(user) || isReception(user)) {
    return inOrganization(user, group.organizationId);
  }
  return (
    isTutor(user) && user.id === group.tutorId && user.switches.tutorManagesStudents
  );
}

/**
 * O'quvchining parolini tiklash — bloklashdan ALOHIDA kalit
 * (`tutorResetsPasswords`).
 *
 * Nega ikkitasi: parol tiklash o'quvchi hisobiga to'liq kirish imkonini
 * beradi (uning nomidan test ishlash, to'lov yuborish), bloklash esa
 * faqat kirishni to'xtatadi. Direktor birinchisini bermay, ikkinchisini
 * berishi mumkin bo'lishi kerak.
 */
export function canResetStudentPassword(user: SessionUser, group: GroupRef): boolean {
  if (isDirector(user) || isReception(user)) {
    return inOrganization(user, group.organizationId);
  }
  return (
    isTutor(user) && user.id === group.tutorId && user.switches.tutorResetsPasswords
  );
}

/**
 * O'quvchini bir guruhdan boshqasiga ko'chirish — Direktor va Qabulxona,
 * o'z tashkiloti ichida (o'quvchi ham, maqsad guruh ham shu tashkilotga
 * tegishli bo'lishi shart).
 *
 * Ustozga bu huquq ATAYLAB berilmagan va KALIT BILAN HAM berilmaydi.
 * Ilgari bu yerda "ustoz o'z guruhiga qo'sha oladi" sharti bor edi,
 * lekin u faqat MAQSAD guruhni tekshirar, o'quvchi ilgari kimga
 * tegishli ekanini tekshirmas edi — natijada har qanday ustoz
 * tashkilotdagi istalgan o'quvchini o'z guruhiga "tortib" olib, so'ng
 * canManageStudent'dan o'tib, uning parolini tiklab, hisobiga to'liq
 * kirib olishi mumkin edi. Ya'ni bu teshik `tutorManagesStudents`
 * kaliti yoqilgan zahoti qaytib kelardi. Guruh o'zgartirish mahsulot
 * bo'yicha ham ma'muriy ish — ustozniki emas (`docs/rollar.md`,
 * o'zgarmas qoida 3).
 */
export function canAssignStudentToGroup(
  user: SessionUser,
  student: StudentRef,
  targetGroup: GroupRef
): boolean {
  if (!isDirector(user) && !isReception(user)) return false;
  return (
    inOrganization(user, student.organizationId) &&
    inOrganization(user, targetGroup.organizationId)
  );
}

/**
 * Test urinishini boshqarish (javob berish/yakunlash): FAQAT shu urinish
 * egasi bo'lgan o'quvchining o'zi — Owner/Director/Tutor ham emas, chunki
 * bu boshqaruv emas, imtihon topshirishning o'zi.
 */
export function canTakeAttempt(user: SessionUser, attempt: AttemptRef): boolean {
  return isStudent(user) && user.id === attempt.studentId;
}

/**
 * Vazifa berish va o'chirish: FAQAT guruhning HOZIRGI ustozi.
 *
 * Direktor ham, qabulxona ham ATAYLAB yo'q (mahsulot qarori): vazifa —
 * ustozning o'quv ishi, direktor uni guruh sahifasida faqat ko'radi
 * (`canViewGroup`). Tekshiruv vazifani kim yaratganiga emas, guruhga
 * qaraydi: guruh boshqa ustozga berilsa, eski vazifalarni ham yangi
 * ustoz boshqaradi.
 */
export function canManageAssignment(user: SessionUser, group: GroupRef): boolean {
  return isTutor(user) && user.id === group.tutorId;
}

/**
 * Vazifani bajarish (vazifa orqali test boshlash): shu guruhdagi o'quvchi.
 *
 * O'quvchining guruhi sessiyada yo'q — chaqiruvchi uni bazadan olib
 * beradi (`getStudentGroupId`). `null` (guruhsiz o'quvchi) hech qachon
 * mos kelmaydi.
 */
export function canTakeAssignment(
  user: SessionUser,
  assignment: { groupId: string },
  studentGroupId: string | null
): boolean {
  return isStudent(user) && studentGroupId !== null && studentGroupId === assignment.groupId;
}

/**
 * To'lov SOZLAMALARI: karta raqami, narxlar, sinov kunlari va to'lovni
 * umuman yoqish — FAQAT shu tashkilot Direktori.
 *
 * Qabulxonaga hech qanday kalit bilan ham berilmaydi (`docs/rollar.md`,
 * o'zgarmas qoida 1): kartani o'zgartira oladigan odam butun
 * avtomaktabning pul oqimini o'ziga burib yubora oladi. Ustoz va owner
 * ham yo'q — bu avtomaktabning ichki puli.
 */
export function canManageStudentPaymentSettings(
  user: SessionUser,
  organizationId: string
): boolean {
  return isDirector(user) && inOrganization(user, organizationId);
}

/**
 * To'lovni KO'RIB CHIQISH: chekni tasdiqlash/rad etish va naqd to'lovni
 * qayd etish — Direktor, hamda "Qabulxona pul bilan ishlaydi" kaliti
 * yoqilgan bo'lsa Qabulxona.
 *
 * Sozlamalardan ataylab ajratilgan: bu kundalik kassa ishi, u esa
 * avtomaktabning pul oqimini belgilaydigan qaror. Ustoz bu yerda ham
 * yo'q — pul avtomaktab kartasiga tushadi va ustoz kartaga pul
 * tushganini tekshira olmaydi, ya'ni faqat chek rasmiga ishonib
 * tasdiqlagan bo'lardi.
 */
export function canReviewStudentPayments(
  user: SessionUser,
  organizationId: string
): boolean {
  if (isDirector(user)) return inOrganization(user, organizationId);
  return (
    isReception(user) &&
    user.switches.receptionHandlesPayments &&
    inOrganization(user, organizationId)
  );
}

/**
 * To'lov yozuvi va chekini KO'RISH: o'quvchining o'zi, shu tashkilot
 * Direktori yoki Qabulxonasi.
 *
 * Qabulxona uchun bu kalitga bog'liq EMAS (`docs/rollar.md`: "To'lovlar
 * tarixini ko'rish" va "Chek rasmini ochish" — ❌, sozlanmaydi): kalit
 * o'chirilgan bo'lsa ham u "bu o'quvchi to'laganmi?" degan savolga
 * javob bera olishi kerak, faqat tasdiqlay olmaydi. Chekda karta
 * raqami va ism bor — ustoz va owner ko'rmaydi.
 */
export function canViewStudentPayment(
  user: SessionUser,
  payment: { studentId: string; organizationId: string }
): boolean {
  if (isStudent(user)) return user.id === payment.studentId;
  if (isDirector(user) || isReception(user)) {
    return inOrganization(user, payment.organizationId);
  }
  return false;
}
