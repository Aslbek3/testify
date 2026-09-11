import { requireActiveStudent } from "@/lib/auth";
import { QUESTION_COUNT, EXAM_DURATION_SECONDS, EXAM_MAX_WRONG } from "@/lib/examRules";
import { ModeStartCard } from "../ModeStartCard";

export default async function ImtihonPage({
  searchParams,
}: {
  searchParams: Promise<{ xato?: string }>;
}) {
  await requireActiveStudent();
  const { xato } = await searchParams;

  const minutes = Math.round(EXAM_DURATION_SECONDS / 60);
  const passCount = QUESTION_COUNT.EXAM - EXAM_MAX_WRONG;

  return (
    <ModeStartCard
      title="Imtihon"
      description="Haqiqiy imtihon sharoiti. Natija ustoz va direktor panellarida ham ko'rinadi."
      error={xato}
      rules={[
        `${QUESTION_COUNT.EXAM} ta savol, ${minutes} daqiqa.`,
        `O'tish uchun kamida ${passCount} ta to'g'ri javob (${EXAM_MAX_WRONG} tagacha xato).`,
        "Javoblar yakunlanmaguncha ko'rsatilmaydi — to'g'ri javob ham, izoh ham.",
        "Javobsiz qolgan savol xato deb sanaladi.",
        // Taymer serverda `startedAt` dan hisoblanadi, brauzerda emas —
        // yorliqni yopib qo'yish vaqtni to'xtatmaydi. Buni oldindan aytish
        // shart, aks holda o'quvchi vaqtini yo'qotib, sababini bilmaydi.
        "Taymer sahifani yopsangiz ham to'xtamaydi.",
        // Faqat imtihon o'rtacha ballga va tayyorgarlik holatiga kiradi —
        // bu qoida barcha panellarda bir xil, shuning uchun aytib qo'yiladi.
        "Faqat imtihon natijasi o'rtacha ballga kiradi.",
      ]}
      action={{ href: "/student/test?mode=EXAM", label: "Imtihonni boshlash" }}
    />
  );
}
