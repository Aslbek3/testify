import { prisma } from "@/lib/prisma";
import type { Plan, OrganizationStatus } from "@prisma/client";

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

export async function listOrganizations(): Promise<OrganizationWithCounts[]> {
  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      users: { select: { role: true } },
    },
  });

  return organizations.map((org) => ({
    id: org.id,
    name: org.name,
    city: org.city,
    plan: org.plan,
    status: org.status,
    createdAt: org.createdAt,
    tutorCount: org.users.filter((u) => u.role === "TUTOR").length,
    studentCount: org.users.filter((u) => u.role === "STUDENT").length,
  }));
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
