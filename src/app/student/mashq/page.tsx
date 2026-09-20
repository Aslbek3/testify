import { requireActiveStudent } from "@/lib/auth";
import { QUESTION_COUNT } from "@/lib/examRules";
import { ModeStartCard } from "../ModeStartCard";

export default async function MashqPage({
  searchParams,
}: {
  searchParams: Promise<{ xato?: string }>;
}) {
  await requireActiveStudent();
  const { xato } = await searchParams;

  return (
    <ModeStartCard
      icon="target"
      tone="bg-info-soft text-info"
      title="Mashq"
      description="Bilimni mustahkamlash uchun. Har javobdan keyin to'g'ri javob va izoh darhol ochiladi."
      error={xato}
      highlights={[
        { icon: "clipboardCheck", label: "Savollar", value: `${QUESTION_COUNT.PRACTICE} ta` },
        { icon: "clock", label: "Vaqt", value: "Cheklovsiz" },
        { icon: "book", label: "Izoh", value: "Darhol" },
      ]}
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
