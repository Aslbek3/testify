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

// "studentCount" Prisma ustuni emas (users munosabatidan JS'da hisoblanadi),
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
    include: {
      users: { select: { role: true } },
    },
  });

  const mapped = organizations.map((org) => ({
    id: org.id,
    name: org.name,
    city: org.city,
    plan: org.plan,
    status: org.status,
    createdAt: org.createdAt,
    tutorCount: org.users.filter((u) => u.role === "TUTOR").length,
    studentCount: org.users.filter((u) => u.role === "STUDENT").length,
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
