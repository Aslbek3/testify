import { EXAM_PASS_PERCENT } from "@/lib/examRules";

/**
 * O'quvchiga "endi nima qilay?" degan savolga bitta javob.
 *
 * Nega kerak: panel ko'rsatkichlarni ko'rsatadi (foiz, halqa, tarix), lekin
 * ular o'lchov — harakat emas. O'quvchi ekranni ochganda qaysi tugmani
 * bosishni bilishi kerak, aks holda u odatda eng oson yo'lni (yana o'sha
 * mashq) tanlaydi va zaif mavzusi zaifligicha qolaveradi.
 *
 * Sof funksiya: Prisma yo'q, faqat qaror qoidasi. Qoida bitta joyda tursin —
 * kelajakda bildirishnoma yoki bosh sahifa ham shundan foydalanadi.
 */

/** Shu sondan boshlab xatolar ustida ishlash boshqa hamma ishdan ustun. */
export const MISTAKES_PRIORITY_THRESHOLD = 5;

export type NextStep = {
  title: string;
  description: string;
  href: string;
  action: string;
};

export function getNextStep(input: {
  hasFinishedAttempt: boolean;
  stillWrongCount: number;
  /** Eng zaif mavzu — `getMasteryByTopic` ro'yxati o'sish bo'yicha saralangan. */
  weakestTopic: { topicId: string; topicName: string; masteryPercent: number } | null;
}): NextStep {
  if (!input.hasFinishedAttempt) {
    return {
      title: "Birinchi mashqdan boshlang",
      description:
        "10 ta savol, taymersiz. Javobingiz darhol tekshiriladi va izohi ko'rsatiladi.",
      href: "/student/mashq",
      action: "Mashqni boshlash",
    };
  }

  if (input.stillWrongCount >= MISTAKES_PRIORITY_THRESHOLD) {
    return {
      title: `${input.stillWrongCount} ta xato hal qilinmagan`,
      description:
        "Faqat o'zingiz adashgan savollardan test tuziladi. To'g'ri ishlaganingiz ro'yxatdan chiqadi.",
      href: "/student/test?xatolar=1",
      action: "Xatolar ustida ishlash",
    };
  }

  // Zaif mavzu — o'tish ballidan past o'zlashtirilgani. Chegarani bu yerda
  // qayta yozmaymiz: u imtihon qoidasidan (`EXAM_PASS_PERCENT`) keladi,
  // shunda o'tish sharti o'zgarsa tavsiya ham birga siljiydi.
  if (input.weakestTopic && input.weakestTopic.masteryPercent < EXAM_PASS_PERCENT) {
    return {
      title: `Eng zaif mavzu: ${input.weakestTopic.topicName}`,
      description: `Bu mavzuni ${input.weakestTopic.masteryPercent}% o'zlashtirgansiz. Shu mavzudan mashq qiling.`,
      href: `/student/test?mode=PRACTICE&mavzu=${input.weakestTopic.topicId}`,
      action: "Shu mavzudan mashq",
    };
  }

  return {
    title: "Imtihonga tayyorsiz",
    description: `20 ta savol, 25 daqiqa. O'tish uchun kamida ${EXAM_PASS_PERCENT}% kerak.`,
    href: "/student/imtihon",
    action: "Imtihon topshirish",
  };
}
