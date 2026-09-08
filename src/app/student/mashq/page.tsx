import { requireRole } from "@/lib/auth";
import { QUESTION_COUNT } from "@/lib/examRules";
import { ModeStartCard } from "../ModeStartCard";

export default async function MashqPage({
  searchParams,
}: {
  searchParams: Promise<{ xato?: string }>;
}) {
  await requireRole("STUDENT");
  const { xato } = await searchParams;

  return (
    <ModeStartCard
      title="Mashq"
      description="Bilimni mustahkamlash uchun. Har javobdan keyin to'g'ri javob va izoh darhol ochiladi."
      error={xato}
      rules={[
        `${QUESTION_COUNT.PRACTICE} ta savol, butun bazadan tasodifiy tanlanadi.`,
        "Vaqt cheklovi yo'q.",
        "Javob berilgandan keyin to'g'ri javob, izoh va YHQ bandi ko'rsatiladi.",
        // Bu qoida serverda ham majburlanadi (`savePracticeAnswer`), shuning
        // uchun uni oldindan aytib qo'yish halol: o'quvchi javobni tasodifan
        // bosib qo'ysa, uni qaytarib bo'lmasligini bilishi kerak.
        "Javob berilgach, uni o'zgartirib bo'lmaydi.",
      ]}
      action={{ href: "/student/test?mode=PRACTICE", label: "Mashqni boshlash" }}
    />
  );
}
