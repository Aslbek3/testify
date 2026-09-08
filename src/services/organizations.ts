import { prisma } from "@/lib/prisma";
import type { Plan, OrganizationStatus, Prisma } from "@prisma/client";

export type OrganizationWithCounts = {
  id: string;
  name: string;
  city: string;
  plan: Plan;
  status: OrganizationStatus;
  createdAt: Date;
  /** Bloklanmagan (`isActive`) hisoblar soni — Qoida 5 ga qara. */
  tutorCount: number;
  /** Bloklanmagan va guruhga biriktirilgan o'quvchilar soni. */
  studentCount: number;
};

// "studentCount" Prisma ustuni emas (alohida groupBy so'rovi bilan sanaladi),
// shuning uchun uni saralash faqat olingan massiv ustida amalga oshiriladi —
// "name" va "createdAt" uchun esa haqiqiy Prisma ustuni bo'lgani sababli
// orderBy'da saralanadi.
export type OrganizationSortField = "name" | "studentCount" | "createdAt";
export type OrganizationSortDirection = "asc" | "desc";

export type ListOrganizationsParams = {
  q?: string;
  status?: OrganizationStatus;
  sortField?: OrganizationSortField;
  sortDirection?: OrganizationSortDirection;
};

export async function listOrganizations(
  params: ListOrganizationsParams = {}
): Promise<OrganizationWithCounts[]> {
  const { q, status, sortField = "createdAt", sortDirection = "desc" } = params;

  const where: Prisma.OrganizationWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status) {
    where.status = status;
  }

  const organizations = await prisma.organization.findMany({
    where,
    orderBy:
      sortField === "name"
        ? { name: sortDirection }
        : sortField === "createdAt"
          ? { createdAt: sortDirection }
          : { createdAt: "desc" },
  });

  // Ustoz/o'quvchi sonlari bazaning o'zida sanaladi: har bir tashkilotning
  // barcha user qatorlarini yuklab, JS'da filter qilish o'rniga bitta
  // groupBy — natijada tashkilot boshiga ko'pi bilan ikkita qator qaytadi.
  //
  // `isActive: true` — bloklangan hisob endi sanoqqa kirmaydi. Ilgari 100
  // o'quvchidan 30 tasi bloklangan tashkilot ham "100" ko'rsatardi, ya'ni
  // tarif/hisob-kitob qarori uchun ishlatilsa 30% xato raqam edi.
  //
  // O'quvchi uchun qo'shimcha `studentProfile: { isNot: null }` sharti —
  // direktorning o'z ro'yxati (`listStudentsForOrganization`) guruh profili
  // yo'q o'quvchini ko'rsatmaydi; shart bo'lmasa owner "50", direktor esa
  // "48" ko'rardi. Shart faqat STUDENT shoxida: ustozda profil bo'lmaydi.
  const counts =
    organizations.length === 0
      ? []
      : await prisma.user.groupBy({
          by: ["organizationId", "role"],
          where: {
            organizationId: { in: organizations.map((org) => org.id) },
            isActive: true,
            OR: [
              { role: "TUTOR" },
              { role: "STUDENT", studentProfile: { isNot: null } },
            ],
          },
          _count: { _all: true },
        });

  const countByOrg = new Map<string, { tutorCount: number; studentCount: number }>();
  for (const row of counts) {
    if (!row.organizationId) continue;
    const entry = countByOrg.get(row.organizationId) ?? { tutorCount: 0, studentCount: 0 };
    if (row.role === "TUTOR") entry.tutorCount = row._count._all;
    else entry.studentCount = row._count._all;
    countByOrg.set(row.organizationId, entry);
  }

  const mapped = organizations.map((org) => ({
    id: org.id,
    name: org.name,
    city: org.city,
    plan: org.plan,
    status: org.status,
    createdAt: org.createdAt,
    tutorCount: countByOrg.get(org.id)?.tutorCount ?? 0,
    studentCount: countByOrg.get(org.id)?.studentCount ?? 0,
  }));

  if (sortField === "studentCount") {
    mapped.sort((a, b) =>
      sortDirection === "asc"
        ? a.studentCount - b.studentCount
        : b.studentCount - a.studentCount
    );
  }

  return mapped;
}

export type PlatformOverview = {
  organizationCount: number;
  activeOrganizationCount: number;
  /** Butun platforma bo'yicha bloklanmagan o'quvchi hisoblari. */
  studentCount: number;
  /** Shundan holati "Faol" bo'lgan tashkilotlardagilari. */
  activeOrganizationStudentCount: number;
};

/**
 * Owner panelidagi plitkalar uchun. Plitkalar filtrga bog'liq bo'lmasligi
 * kerak, lekin buning uchun ilgari `listOrganizations()` ikkinchi marta —
 * filtrsiz — chaqirilardi va natijadan faqat uchta yig'indi olinardi. Endi
 * uchta `count` so'rovi ketadi, tashkilot qatorlari umuman yuklanmaydi.
 *
 * Sonlar `isActive: true` bo'yicha — "faol" bu yerda "hisobi bloklanmagan"
 * degani; tashkilot holati (ACTIVE/TRIAL/EXPIRED) esa butunlay boshqa narsa
 * va u alohida ko'rsatiladi.
 */
export async function getPlatformOverview(): Promise<PlatformOverview> {
  const activeStudentWhere: Prisma.UserWhereInput = {
    role: "STUDENT",
    isActive: true,
    studentProfile: { isNot: null },
  };

  const [
    organizationCount,
    activeOrganizationCount,
    studentCount,
    activeOrganizationStudentCount,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: activeStudentWhere }),
    prisma.user.count({
      where: { ...activeStudentWhere, organization: { status: "ACTIVE" } },
    }),
  ]);

  return {
    organizationCount,
    activeOrganizationCount,
    studentCount,
    activeOrganizationStudentCount,
  };
}

/** "Yangi direktor" modalidagi tashkilot tanlash ro'yxati uchun. */
export async function listOrganizationOptions(): Promise<
  { id: string; name: string }[]
> {
  return prisma.organization.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function createOrganization(input: {
  name: string;
  city: string;
  plan: Plan;
  status?: OrganizationStatus;
}) {
  return prisma.organization.create({
    data: {
      name: input.name,
      city: input.city,
      plan: input.plan,
      status: input.status ?? "TRIAL",
    },
  });
}
