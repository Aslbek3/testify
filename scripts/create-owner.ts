// Birinchi App Owner hisobini yaratish uchun bir martalik skript.
// Ishlatilishi: OWNER_EMAIL, OWNER_NAME, OWNER_PASSWORD muhit
// o'zgaruvchilari orqali (docs/deploy.md ga qarang):
//
//   OWNER_EMAIL=owner@example.com OWNER_NAME="Ism Familiya" \
//     OWNER_PASSWORD="uzun-tasodifiy-parol" npm run create-owner
//
// Bir nechta owner bo'lishi mumkin (masalan, ikkinchi admin qo'shish
// uchun ham shu skript qayta ishlatiladi) — shuning uchun bazada
// allaqachon OWNER bo'lsa faqat ogohlantiradi, to'xtatmaydi. Lekin xuddi
// shu email bilan foydalanuvchi mavjud bo'lsa xato berib to'xtaydi.
import { prisma } from "@/lib/prisma";
import { createOwner, countOwners } from "@/services/users";
import { RegistrationError } from "@/services/auth";

async function main() {
  const email = process.env.OWNER_EMAIL?.trim();
  const name = process.env.OWNER_NAME?.trim();
  const password = process.env.OWNER_PASSWORD;

  if (!email || !name || !password) {
    console.error(
      "XATO: OWNER_EMAIL, OWNER_NAME va OWNER_PASSWORD muhit o'zgaruvchilari to'liq berilishi shart"
    );
    process.exitCode = 1;
    return;
  }
  if (password.length < 8) {
    console.error("XATO: OWNER_PASSWORD kamida 8 belgidan iborat bo'lishi kerak");
    process.exitCode = 1;
    return;
  }

  const existingOwners = await countOwners();
  if (existingOwners > 0) {
    console.warn(
      `OGOHLANTIRISH: bazada allaqachon ${existingOwners} ta OWNER mavjud — davom etilmoqda.`
    );
  }

  try {
    const owner = await createOwner({ name, email, password });
    console.log(`Owner yaratildi: ${owner.email} (id: ${owner.id})`);
  } catch (error) {
    if (error instanceof RegistrationError) {
      console.error(`XATO: ${error.message}`);
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
