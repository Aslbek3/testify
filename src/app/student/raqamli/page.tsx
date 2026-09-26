import { requireActiveStudent } from "@/lib/auth";
import { MARATHON_MIN_QUESTIONS } from "@/services/attempts";
import { countNumericQuestions } from "@/services/numericQuestions";
import { ModeStartCard } from "../ModeStartCard";

/**
 * "Raqamli savollar" — ichida son bor savollar bitta mashqda.
 *
 * Sabab `services/numericQuestions.ts` da: YHQ'ning yodlash eng qiyin
 * qismi raqamlar (tezlik, masofa, o'lcham, muddat), ular esa mavzular
 * bo'ylab tarqoq yotadi.
 */
export default async function NumericQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ xato?: string }>;
}) {
  await requireActiveStudent();
  const { xato } = await searchParams;

  const available = await countNumericQuestions();
  const tooFew = available < MARATHON_MIN_QUESTIONS;

  return (
    <ModeStartCard
      icon="target"
      tone="bg-purple-soft text-purple"
      title="Raqamli savollar"
      description="Ichida son bor savollar — tezlik chegaralari, masofalar, o'lchamlar va muddatlar bir joyda."
      error={
        xato ??
        (tooFew
          ? `Raqamli savollar yetarli emas: bazada ${available} ta, kamida ${MARATHON_MIN_QUESTIONS} ta kerak.`
          : undefined)
      }
      highlights={[
        { icon: "clipboardCheck", label: "Savollar", value: `${available} ta` },
        { icon: "clock", label: "Vaqt", value: "Cheklovsiz" },
        { icon: "book", label: "Izoh", value: "Darhol" },
      ]}
      rules={[
        "Savol matnida yoki javob variantlarida son bo'lsa — u shu ro'yxatga kiradi.",
        "Savollar har safar tasodifiy tartibda beriladi.",
        "Mashqdagi kabi: javobdan keyin to'g'ri javob va izoh darhol ochiladi.",
        "Natija o'rtacha ballga kirmaydi — bu mashq, imtihon emas.",
      ]}
      action={
        tooFew
          ? { href: "/student", label: "Panelga qaytish" }
          : { href: "/student/test?raqamli=1", label: "Boshlash" }
      }
    />
  );
}
