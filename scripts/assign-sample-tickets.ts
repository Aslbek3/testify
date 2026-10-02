// Mavjud savollarni biletlarga biriktiradi.
//
// NEGA KERAK: "Biletlar" bo'limi `Question.ticketNumber` ga tayanadi.
// `prisma/seed.ts` buni lokal bazada qiladi, lekin production hech
// qachon seed qilinmagan (CLAUDE.md) — u yerda savollar qo'lda
// ko'chirilgan va birortasiga bilet raqami qo'yilmagan. Natijada
// production'da bo'lim "Biletlar hali kiritilmagan" deb turardi.
//
// ⚠️ BU VAQTINCHALIK YECHIM. Haqiqiy biletlar savollar bazasi bilan
// birga, import orqali keladi (`ticketNumber` va `ticketOrder`
// maydonlari import formatida bor). Bu skript faqat bo'lim ishlashini
// ko'rsatish uchun — savollar to'lgach, import uning ustiga yozadi.
//
// Ishlatilishi:
//   npx tsx scripts/assign-sample-tickets.ts            # 4 ta bilet
//   TICKET_COUNT=3 npx tsx scripts/assign-sample-tickets.ts
//   TICKET_SIZE=20 TICKET_COUNT=2 npx tsx scripts/assign-sample-tickets.ts
//
// Idempotent: har ishga tushirilganda avval MAVJUD bilet biriktirishlari
// tozalanadi, keyin qaytadan taqsimlanadi. Ya'ni ikki marta ishga
// tushirish natijani o'zgartirmaydi va dublikat yaratmaydi.
import { prisma } from "@/lib/prisma";

const ticketCount = Number(process.env.TICKET_COUNT ?? 4);
const envSize = process.env.TICKET_SIZE ? Number(process.env.TICKET_SIZE) : null;

async function main() {
  if (!Number.isInteger(ticketCount) || ticketCount < 1) {
    throw new Error("TICKET_COUNT butun va 1 dan katta bo'lishi kerak");
  }

  // Savollar MAVZULAR bo'yicha olinadi, keyin navbat bilan aralashtiriladi.
  // Aks holda 1-bilet butunlay bitta mavzudan iborat bo'lib qolardi va
  // bilet rejimining ma'nosi yo'qolardi: bilet — imtihonning kichik
  // nusxasi, ya'ni turli mavzularni qamrashi kerak.
  const topics = await prisma.topic.findMany({
    select: {
      name: true,
      questions: { select: { id: true }, orderBy: { id: "asc" } },
    },
    orderBy: { name: "asc" },
  });

  const mixed: string[] = [];
  for (let i = 0; ; i += 1) {
    const before = mixed.length;
    for (const topic of topics) {
      const question = topic.questions[i];
      if (question) mixed.push(question.id);
    }
    if (mixed.length === before) break;
  }

  if (mixed.length === 0) {
    console.log("Bazada savol yo'q — hech narsa qilinmadi.");
    return;
  }

  const size = envSize ?? Math.floor(mixed.length / ticketCount);
  if (size < 1) {
    throw new Error(
      `${mixed.length} ta savolni ${ticketCount} ta biletga bo'lib bo'lmaydi. ` +
        "TICKET_COUNT ni kamaytiring."
    );
  }

  // Avval hammasini tozalaymiz — skript qayta ishga tushirilganda eski
  // taqsimot qolib ketmasin (masalan bilet soni kamaytirilsa).
  const cleared = await prisma.question.updateMany({
    where: { ticketNumber: { not: null } },
    data: { ticketNumber: null, ticketOrder: null },
  });

  let assigned = 0;
  for (let ticket = 1; ticket <= ticketCount; ticket += 1) {
    for (let order = 1; order <= size; order += 1) {
      const questionId = mixed[assigned];
      if (!questionId) break;
      await prisma.question.update({
        where: { id: questionId },
        data: { ticketNumber: ticket, ticketOrder: order },
      });
      assigned += 1;
    }
  }

  const leftover = mixed.length - assigned;
  console.log(`Bazadagi savollar:     ${mixed.length} ta (${topics.length} mavzu)`);
  console.log(`Tozalandi:             ${cleared.count} ta eski biriktirish`);
  console.log(`Biletlar:              ${ticketCount} ta, har birida ${size} ta savol`);
  console.log(`Biriktirildi:          ${assigned} ta savol`);
  if (leftover > 0) {
    console.log(`Biletsiz qoldi:        ${leftover} ta (mashq va imtihonda baribir chiqadi)`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
