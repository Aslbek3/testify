// Bir martalik/qayta ishlatiladigan skript: 4 rolli test hisoblarini
// (Owner/Direktor/Ustoz/O'quvchi) production bazada yaratadi yoki mavjud
// bo'lsa parolini qayta o'rnatadi.
//
// ⚠️ Bu skript production bazasida ishlaydi. Ishga tushirilgan sari
// quyidagi 4 ta hisobning (owner/director/tutor/student1@testify.dev)
// parolini RESET_TEST_PASSWORD qiymatiga qaytaradi va sessionVersion'ni
// oshiradi (mavjud sessiyalarni darhol tugatadi). Boshqa foydalanuvchi
// yoki urinish (Attempt) ma'lumotlariga tegmaydi — faqat shu 4 ta hisob,
// "test-org-1" tashkiloti va "test-group-1" guruhi upsert qilinadi.
//
// Ishlatilishi: RESET_TEST_PASSWORD="..." npx tsx scripts/reset-test-accounts.ts
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const SALT_ROUNDS = 10;
const envPassword = process.env.RESET_TEST_PASSWORD;
if (!envPassword) {
  throw new Error("RESET_TEST_PASSWORD environment variable is required");
}
const PASSWORD: string = envPassword;

async function upsertUser(input: {
  name: string;
  email: string;
  role: "OWNER" | "DIRECTOR" | "TUTOR" | "STUDENT";
  organizationId?: string;
}) {
  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      passwordHash,
      isActive: true,
      sessionVersion: { increment: 1 },
    },
    create: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      organizationId: input.organizationId ?? null,
    },
  });
  console.log(`${input.role}: ${user.email} (id: ${user.id})`);
  return user;
}

async function main() {
  const owner = await upsertUser({
    name: "Test Owner",
    email: "owner@testify.dev",
    role: "OWNER",
  });

  const org = await prisma.organization.upsert({
    where: { id: "test-org-1" },
    update: {},
    create: {
      id: "test-org-1",
      name: "Test Avtomaktab",
      city: "Toshkent",
      plan: "STANDARD",
      status: "ACTIVE",
    },
  });
  console.log(`Organization: ${org.name} (id: ${org.id})`);

  const director = await upsertUser({
    name: "Test Direktor",
    email: "director@testify.dev",
    role: "DIRECTOR",
    organizationId: org.id,
  });

  const tutor = await upsertUser({
    name: "Test Ustoz",
    email: "tutor@testify.dev",
    role: "TUTOR",
    organizationId: org.id,
  });

  const group = await prisma.group.upsert({
    where: { id: "test-group-1" },
    update: { tutorId: tutor.id, organizationId: org.id },
    create: {
      id: "test-group-1",
      name: "Test Guruh",
      tutorId: tutor.id,
      organizationId: org.id,
    },
  });
  console.log(`Group: ${group.name} (id: ${group.id})`);

  const student = await upsertUser({
    name: "Test O'quvchi",
    email: "student1@testify.dev",
    role: "STUDENT",
    organizationId: org.id,
  });

  await prisma.studentProfile.upsert({
    where: { userId: student.id },
    update: { groupId: group.id },
    create: { userId: student.id, groupId: group.id },
  });

  console.log("\nBarcha 4 hisob tayyor. Parol hammasida: " + PASSWORD);
  void owner;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
