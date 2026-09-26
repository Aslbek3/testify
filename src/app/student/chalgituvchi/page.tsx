import { requireActiveStudent } from "@/lib/auth";
import { MARATHON_MIN_QUESTIONS } from "@/services/attempts";
import {
  listTrickyQuestions,
  TRICKY_MIN_ANSWERS,
  TRICKY_MIN_WRONG_PERCENT,
} from "@/services/questions";
import { ModeStartCard } from "../ModeStartCard";

/**
 * "Chalg'ituvchi" savollar — ko'pchilik qoqiladigan savollar.
 *
 * "Xatolarim" dan farqi ochiq yozilgan: u SIZNING xatolaringiz, bu esa
 * BOSHQALARNIKI. Ikkisi chalkashtirilsa, o'quvchi "men bu savolga
 * javob bermagan edim-ku" deb o'ylab qoladi.
 *
 * ⚠️ DEMO: chegara past (`TRICKY_MIN_ANSWERS`), chunki platformada hali
 * kam javob bor. Buni sahifa yashirmaydi.
 */
export default async function TrickyQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ xato?: string }>;
}) {
  await requireActiveStudent();
  const { xato } = await searchParams;

  const tricky = await listTrickyQuestions();
  const tooFew = tricky.length < MARATHON_MIN_QUESTIONS;

  return (
    <ModeStartCard
      icon="alertTriangle"
      tone="bg-warning-soft text-warning"
      title="Chalg'ituvchi savollar"
      description="Ko'pchilik qoqiladigan savollar — sizning xatolaringiz emas, boshqalarniki."
      error={
        xato ??
        (tooFew
          ? `Hozircha ${tricky.length} ta savol yig'ildi, boshlash uchun kamida ${MARATHON_MIN_QUESTIONS} ta kerak. Ko'proq imtihon topshirilgach ro'yxat to'ladi.`
          : undefined)
      }
      highlights={[
        { icon: "clipboardCheck", label: "Savollar", value: `${tricky.length} ta` },
        { icon: "clock", label: "Vaqt", value: "Cheklovsiz" },
        { icon: "book", label: "Izoh", value: "Darhol" },
      ]}
      rules={[
        `Ro'yxatga kamida ${TRICKY_MIN_ANSWERS} ta javob berilgan va ${TRICKY_MIN_WRONG_PERCENT}% dan ko'p xato qilingan savollar kiradi.`,
        "Statistika butun platforma bo'yicha — bu «sizga qiyin» emas, «hammaga qiyin» degani.",
        "O'z xatolaringiz alohida bo'limda: «Xatolarim».",
        "Mashqdagi kabi: javobdan keyin to'g'ri javob va izoh darhol ochiladi.",
        "⚠️ Bo'lim demo holatida: chegara ataylab past qo'yilgan, chunki hali kam javob to'plangan.",
      ]}
      action={
        tooFew
          ? { href: "/student", label: "Panelga qaytish" }
          : { href: "/student/test?chalgituvchi=1", label: "Boshlash" }
      }
    />
  );
}
