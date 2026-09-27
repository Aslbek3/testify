import { prisma } from "@/lib/prisma";
import { DirectorActionError } from "@/services/directorShared";

/**
 * Guruhlar: yaratish, tahrirlash, o'chirish va bitta guruhning tafsiloti.
 *
 * `directorDashboard.ts` dan ajratilgan (2026-09-27). Panel
 * KO'RSATKICHLARI (o'rtacha ball, reyting) o'sha faylda qoldi: ular
 * faqat o'qiydi, bu yer esa YOZADI — chegarani fayl darajasida
 * ko'rsatib qo'ygan ma'qul.
 */

/** "Yangi guruh" modalidagi ustoz tanlash ro'yxati uchun. */
export async function listTutorsForOrganization(
  organizationId: string
): Promise<{ id: string; name: string }[]> {
  return prisma.user.findMany({
    where: { organizationId, role: "TUTOR" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Guruh nomining eng ko'p uzunligi. Bazada cheklov yo'q (`String`), lekin
 * cheklovsiz nom jadval ustunini va sidebarni buzadi. Yaratish ham,
 * tahrirlash ham AYNI shu chegaradan o'tadi — shuning uchun raqam bitta
 * joyda turadi va ikkala route ham servisdagi tekshiruvga tayanadi.
 */
export const GROUP_NAME_MAX_LENGTH = 60;

/**
 * "Bu ustozga guruh berish mumkinmi?" — yaratishda ham, tahrirlashda ham
 * bir xil shart: ustoz mavjud, roli TUTOR va AYNI tashkilotga tegishli.
 * Ilgari faqat `createGroup` ichida edi; tahrirlash qo'shilgach ikkinchi
 * nusxa paydo bo'lmasligi uchun alohida funksiyaga chiqarildi (aks holda
 * biri o'zgartirilib ikkinchisi unutilsa, direktor boshqa tashkilotning
 * ustoziga guruh biriktira olib qolardi).
 */
async function assertTutorInOrganization(tutorId: string, organizationId: string) {
  const tutor = await prisma.user.findUnique({
    where: { id: tutorId },
    select: { role: true, organizationId: true },
  });
  if (!tutor || tutor.role !== "TUTOR" || tutor.organizationId !== organizationId) {
    throw new DirectorActionError(
      "Tanlangan ustoz shu tashkilotga tegishli emas yoki topilmadi"
    );
  }
}

/** Nom bo'sh yoki haddan tashqari uzun emasligini tekshiradi va trim qiladi. */
function normalizeGroupName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new DirectorActionError("Guruh nomi bo'sh bo'lishi mumkin emas");
  }
  if (trimmed.length > GROUP_NAME_MAX_LENGTH) {
    throw new DirectorActionError(
      `Guruh nomi ${GROUP_NAME_MAX_LENGTH} belgidan oshmasligi kerak`
    );
  }
  return trimmed;
}

export async function createGroup(input: {
  name: string;
  tutorId: string;
  organizationId: string;
}) {
  const name = normalizeGroupName(input.name);
  await assertTutorInOrganization(input.tutorId, input.organizationId);

  return prisma.group.create({
    data: {
      name,
      tutorId: input.tutorId,
      organizationId: input.organizationId,
    },
  });
}

export type GroupDetail = {
  id: string;
  name: string;
  /** `canManageGroup` / `canViewGroup` uchun kerak — ruxsat tekshiruvi shu ikki maydonga tayanadi. */
  tutorId: string;
  organizationId: string;
  tutorName: string;
  studentCount: number;
  attemptCount: number;
};

/**
 * Bitta guruh haqidagi ma'lumot — ham ruxsat tekshiruvi (`tutorId`,
 * `organizationId`), ham sarlavha uchun. Topilmasa `null`: chaqiruvchi
 * "topilmadi" va "ruxsat yo'q"ni bir xil javob bilan qaytaradi, aks holda
 * boshqa tashkilotda qaysi guruh ID'lari borligini bilib olish mumkin
 * bo'lardi.
 */
export async function getGroupDetail(groupId: string): Promise<GroupDetail | null> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      tutorId: true,
      organizationId: true,
      tutor: { select: { name: true } },
      _count: { select: { students: true, attempts: true } },
    },
  });
  if (!group) return null;

  return {
    id: group.id,
    name: group.name,
    tutorId: group.tutorId,
    organizationId: group.organizationId,
    tutorName: group.tutor.name,
    studentCount: group._count.students,
    attemptCount: group._count.attempts,
  };
}

/**
 * Guruh nomini va/yoki biriktirilgan ustozini o'zgartirish.
 *
 * Yangi ustoz guruhning O'Z tashkiloti bo'yicha tekshiriladi (chaqiruvchining
 * tashkiloti bo'yicha emas) — ruxsat tekshiruvi route'da allaqachon
 * bajarilgan, bu yerda esa ma'lumotlar butunligi muhim: guruh hech qachon
 * boshqa tashkilotning ustoziga o'tib qolmasin.
 *
 * Ustoz almashtirilganda eski urinishlar (`Attempt.groupId`) TEGILMAYDI —
 * ular guruhda qoladi, ya'ni ustozlar reytingida ball yangi ustozga o'tadi.
 * Bu ataylab: reyting "kim shu guruh bilan ishlayapti" degan savolga javob
 * beradi, guruh esa butunligicha yangi ustozga topshiriladi.
 */
export async function updateGroup(
  groupId: string,
  input: { name?: string; tutorId?: string }
) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { organizationId: true },
  });
  if (!group) {
    throw new DirectorActionError("Guruh topilmadi");
  }

  const name = input.name === undefined ? undefined : normalizeGroupName(input.name);

  if (input.tutorId !== undefined) {
    await assertTutorInOrganization(input.tutorId, group.organizationId);
  }

  return prisma.group.update({
    where: { id: groupId },
    // Berilmagan maydon `data` ga umuman qo'shilmaydi — `undefined` yozib
    // yuborish o'rniga. Shunda faqat nomni yuborgan so'rov ustozni
    // tasodifan o'zgartirib yubormaydi.
    data: {
      ...(name === undefined ? {} : { name }),
      ...(input.tutorId === undefined ? {} : { tutorId: input.tutorId }),
    },
  });
}

/**
 * Guruhni o'chirish — FAQAT hech qanday izi qolmagan guruh o'chiriladi:
 * o'quvchisi ham, unga bog'langan urinishi ham bo'lmasligi kerak.
 *
 * Nega urinish bo'lsa ham taqiqlanadi (ogohlantirish bilan ruxsat berish
 * emas): `Attempt.groupId` — ixtiyoriy (`String?`) bog'lanish, ya'ni Prisma
 * standart qoidasi bo'yicha guruh o'chirilsa urinishlarning `groupId`si
 * jimgina `null` ga aylanadi. Bunday urinish esa hech qanday hisobga
 * tushmaydi: tashkilot o'rtacha bali ham, ustozlar reytingi ham, guruh
 * tahlili ham `JOIN "Group" g ON g."id" = a."groupId"` orqali ishlaydi.
 * Ya'ni bo'sh ko'ringan guruhni o'chirish (o'quvchilari boshqa guruhga
 * ko'chirilgan bo'lsa, u aynan shunday ko'rinadi) tashkilotning o'tgan
 * oylardagi statistikasini ortga qaytarib buzardi va buni keyin tiklab
 * bo'lmasdi. O'chirishning maqsadi — xato yaratilgan, umuman ishlatilmagan
 * guruhdan qutulish; tarixi bor guruh uchun to'g'ri amal — nomini
 * o'zgartirish yoki boshqa ustozga berish.
 *
 * Tekshiruv va o'chirish bitta tranzaksiyada: aks holda tekshiruv bilan
 * o'chirish orasida ustoz guruhga o'quvchi qo'shib ulgursa, Prisma
 * cheklov xatosini (P2003) qaytarib, foydalanuvchi tushunarsiz 500
 * ko'rardi.
 */
export async function deleteGroup(groupId: string) {
  return prisma.$transaction(async (tx) => {
    const group = await tx.group.findUnique({
      where: { id: groupId },
      select: { _count: { select: { students: true, attempts: true } } },
    });
    if (!group) {
      throw new DirectorActionError("Guruh topilmadi");
    }
    if (group._count.students > 0) {
      throw new DirectorActionError(
        `Guruhda ${group._count.students} ta o'quvchi bor. Avval ularni boshqa guruhga ko'chiring.`
      );
    }
    if (group._count.attempts > 0) {
      throw new DirectorActionError(
        `Bu guruhda ${group._count.attempts} ta test urinishi qolgan (o'quvchilar boshqa guruhga ko'chirilgan bo'lsa ham, urinishlari shu guruhda qoladi). Guruh o'chirilsa bu natijalar statistikadan butunlay yo'qoladi. Guruh nomini o'zgartiring yoki boshqa ustozga bering.`
      );
    }

    // Vazifalar guruhsiz ma'nosiz. Bu nuqtada ularga bog'langan urinish
    // ham yo'q (yuqoridagi shart), ya'ni hech qanday natija yo'qolmaydi.
    await tx.assignment.deleteMany({ where: { groupId } });
    return tx.group.delete({ where: { id: groupId } });
  });
}


/** Guruh filtri va "guruhni o'zgartirish"/"yangi o'quvchi" tanlash ro'yxatlari uchun. */
export async function listGroupsForOrganization(
  organizationId: string
): Promise<{ id: string; name: string }[]> {
  return prisma.group.findMany({
    where: { organizationId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
