import type { AttemptMode } from "@prisma/client";
import type { ReadinessStatus } from "@/lib/readiness";
import type { TopicMastery } from "@/services/studentDashboard";

/**
 * Ustoz bo'limining UMUMIY tiplari.
 *
 * `tutorDashboard.ts` dan ajratilgan (2026-09-28): u 560 qatorga
 * yetgan edi. Tiplar alohida faylda, chunki ularni ham
 * `groupAnalytics.ts`, ham `tutorDashboard.ts` ishlatadi — aks holda
 * ikkalasi bir-birini aylanma import qilardi.
 */

export type TutorGroup = { id: string; name: string };

export type TopicErrorRate = {
  topicId: string;
  topicName: string;
  errorRatePercent: number;
};

export type MissedQuestion = {
  questionId: string;
  questionText: string;
  topicName: string;
  missPercent: number;
};

export type RosterEntry = {
  studentId: string;
  name: string;
  isActive: boolean;
  examAttemptCount: number;
  practiceAttemptCount: number;
  lastActivityAt: Date | null;
  averageScore: number | null;
  status: ReadinessStatus;
};

export type StudentGroupContext = {
  student: { userId: string; organizationId: string | null };
  /**
   * Ruxsat tekshiruvi uchun MINIMAL ma'lumot (`GroupRef`) — ataylab
   * shunday: `lib/permissions.ts` funksiyalari faqat shu ikki maydonga
   * tayanadi va ularga ortiqcha narsa berilsa, tekshiruv nimaga
   * asoslanayotgani ko'rinmay qolardi.
   */
  group: { tutorId: string; organizationId: string };
  /**
   * Ko'rsatish uchun — guruh sahifasiga havola va yo'l ko'rsatkich.
   * `group` ichiga qo'shilmadi: u ruxsat tekshiruvining kiritmasi.
   */
  groupId: string;
  groupName: string;
};

export type StudentDetail = {
  name: string;
  /** Hisob bloklanmaganmi — o'quvchi sahifasidagi "Bloklash" tugmasi uchun. */
  isActive: boolean;
  /** Qaysi guruhda ekani — sahifa sarlavhasida ko'rsatiladi. */
  groupName: string | null;
  // O'quvchining o'z panelidagi bilan AYNI tip — ataylab: ikkala ekran bir
  // xil funksiyadan (studentDashboard'dagi getMasteryByTopic) oziqlanadi,
  // shuning uchun ustoz va o'quvchi hech qachon boshqa-boshqa foiz ko'rmaydi.
  masteryByTopic: TopicMastery[];
  attempts: { id: string; date: string; score: number | null; mode: AttemptMode }[];
};
