// `prisma/seedContent.ts` dagi mavzu va savollarni bazaga ko'chiradi.
//
// NEGA ALOHIDA SKRIPT: `prisma/seed.ts` ni production'da ishga tushirib
// bo'lmaydi — u kontentdan tashqari test hisoblari, guruhlar va soxta
// test urinishlarini ham yaratadi (CLAUDE.md: "faqat lokal dev baza").
// Bu skript esa FAQAT `TOPIC_DEFS` ni oladi: mavzu va savol, boshqa
// hech narsa.
//
// Production'da 2026-09-06 da 20 ta savol QO'LDA ko'chirilgan edi va
// o'sha paytdagi deterministik ID sxemasi ishlatilgan
// (`seed-topic-<slug>`, `<topicId>-q<i>`). Shu skript ham AYNAN o'sha
// sxemani ishlatadi, ya'ni mavjud 20 ta savol dublikat bo'lmaydi —
// ustiga yoziladi (upsert).
//
// Ishlatilishi:
//   npx tsx scripts/import-seed-questions.ts
//
// Idempotent: qayta ishga tushirilsa yangi qator yaratmaydi, faqat
// mavjudlarini yangilaydi. O'quvchilarning javoblariga TEGMAYDI —
// savol ID'si o'zgarmagani uchun urinishlar tarixi saqlanib qoladi.
import { prisma } from "@/lib/prisma";
import { TOPIC_DEFS, slugify } from "../prisma/seedContent";

async function main() {
  let createdTopics = 0;
  let questions = 0;

  for (const t of TOPIC_DEFS) {
    const topicId = `seed-topic-${slugify(t.name)}`;
    const existing = await prisma.topic.findUnique({
      where: { id: topicId },
      select: { id: true },
    });
    if (!existing) createdTopics += 1;

    const topic = await prisma.topic.upsert({
      where: { id: topicId },
      update: { category: t.category },
      create: { id: topicId, name: t.name, category: t.category },
    });

    for (let i = 0; i < t.questions.length; i += 1) {
      const q = t.questions[i];
      // `update` ham to'liq to'ldiriladi: matn yoki izoh tuzatilsa, u
      // mavjud qatorga ham yetib borsin (seed.ts dagi bilan bir xil
      // qoida va bir xil sabab).
      const data = {
        topicId: topic.id,
        text: q.text,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        explanation: q.explanation ?? null,
        legalReference: "legalReference" in q ? (q.legalReference ?? null) : null,
        imageUrl: "imageUrl" in q ? (q.imageUrl ?? null) : null,
        imageAlt: "imageAlt" in q ? (q.imageAlt ?? null) : null,
      };
      await prisma.question.upsert({
        where: { id: `${topic.id}-q${i}` },
        update: data,
        create: { id: `${topic.id}-q${i}`, ...data },
      });
      questions += 1;
    }
  }

  const totalTopics = await prisma.topic.count();
  const totalQuestions = await prisma.question.count();

  console.log(`Yangi mavzu:        ${createdTopics} ta`);
  console.log(`Ko'chirilgan savol: ${questions} ta`);
  console.log(`Bazada jami:        ${totalTopics} mavzu, ${totalQuestions} savol`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
