import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;
const SEED_PASSWORD = "testify123";

async function upsertUser(input: {
  email: string;
  name: string;
  role: "OWNER" | "DIRECTOR" | "TUTOR";
  organizationId?: string;
}) {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS);
  return prisma.user.upsert({
    where: { email: input.email },
    update: {},
    create: {
      email: input.email,
      name: input.name,
      passwordHash,
      role: input.role,
      organizationId: input.organizationId,
    },
  });
}

async function main() {
  const owner = await upsertUser({
    email: "owner@testify.dev",
    name: "Aslbek (App Owner)",
    role: "OWNER",
  });

  const organization = await prisma.organization.upsert({
    where: { id: "seed-org-1" },
    update: {},
    create: {
      id: "seed-org-1",
      name: "Nam-Avto O'quv Markazi",
      city: "Namangan",
      plan: "STANDARD",
      status: "ACTIVE",
    },
  });

  const director = await upsertUser({
    email: "director@testify.dev",
    name: "Otabek Yusupov",
    role: "DIRECTOR",
    organizationId: organization.id,
  });

  const tutor = await upsertUser({
    email: "tutor@testify.dev",
    name: "Sardor Islomov",
    role: "TUTOR",
    organizationId: organization.id,
  });

  const group = await prisma.group.upsert({
    where: { id: "seed-group-1" },
    update: {},
    create: {
      id: "seed-group-1",
      name: "Guruh #14",
      tutorId: tutor.id,
      organizationId: organization.id,
    },
  });

  console.log("Seed tayyor. Test hisoblari (parol hammasida bir xil):");
  console.log(`  Parol: ${SEED_PASSWORD}`);
  console.log(`  Owner:    ${owner.email}`);
  console.log(`  Director: ${director.email}`);
  console.log(`  Tutor:    ${tutor.email}`);
  console.log(`  Guruh (register uchun): ${group.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
