import { prisma } from "@/lib/prisma";
import type { Plan, OrganizationStatus, Prisma } from "@prisma/client";

export type OrganizationWithCounts = {
  id: string;
  name: string;
  city: string;
  plan: Plan;
  status: OrganizationStatus;
  createdAt: Date;
  tutorCount: number;
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
  const counts =
    organizations.length === 0
      ? []
      : await prisma.user.groupBy({
          by: ["organizationId", "role"],
          where: {
            organizationId: { in: organizations.map((org) => org.id) },
            role: { in: ["TUTOR", "STUDENT"] },
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
