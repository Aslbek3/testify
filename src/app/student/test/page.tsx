import { redirect } from "next/navigation";
import { requireActiveStudent } from "@/lib/auth";
import {
  startAttempt,
  getAttemptForResume,
  AttemptError,
  EXAM_DURATION_SECONDS,
} from "@/services/attempts";
import { getStudentGroupId } from "@/services/studentDashboard";
import { startAssignmentAttempt, AssignmentError } from "@/services/assignments";
import { TestRunner } from "./TestRunner";
import type { AttemptMode } from "@prisma/client";

const VALID_MODES: AttemptMode[] = ["PRACTICE", "EXAM"];

export default async function TestPage({
  searchParams,
}: {
  searchParams: Promise<{ attemptId?: string; mode?: string; savollar?: string; vazifa?: string }>;
}) {
  const user = await requireActiveStudent();
  const { attemptId, mode, savollar, vazifa } = await searchParams;

  // Urinish allaqachon boshlangan — davom ettiramiz (sahifa yangilansa ham
  // progress yo'qolmasligi shu orqali ta'minlanadi).
  if (attemptId) {
    let resumed;
    try {
      resumed = await getAttemptForResume({ user, attemptId });
    } catch (error) {
      if (error instanceof AttemptError) {
        redirect("/student");
      }
      throw error;
    }

    if (resumed.finishedAt) {
      redirect(`/student/test/${attemptId}/natija`);
    }

    return <TestRunner attempt={resumed} examDurationSeconds={EXAM_DURATION_SECONDS} />;
  }

  // Vazifa orqali — rejim va mavzularni vazifaning o'zi belgilaydi, URL'dagi
  // `mode`ga qaralmaydi. Egalik va muddat service ichida tekshiriladi.
  if (vazifa) {
    let started;
    try {
      started = await startAssignmentAttempt({ user, assignmentId: vazifa });
    } catch (error) {
      if (error instanceof AssignmentError || error instanceof AttemptError) {
        redirect(`/student?xato=${encodeURIComponent(error.message)}`);
      }
      throw error;
    }
    redirect(`/student/test?attemptId=${started.attemptId}`);
  }

  // Yangi urinish — boshlab, kanonik URL'ga (attemptId bilan) yo'naltiramiz,
  // shunda keyingi refresh yangi urinish YARATMAYDI, davom ettiradi.
  if (mode && VALID_MODES.includes(mode as AttemptMode)) {
    const groupId = await getStudentGroupId(user.id);

    // "Maraton" — savollar sonini o'quvchi tanlaydi. Qiymat baribir
    // `startAttempt` ichida tekshiriladi; bu yerda faqat songa aylantiriladi
    // (noto'g'ri matn kelsa `undefined` bo'lib, standart son ishlatiladi).
    const requested = savollar ? Number(savollar) : undefined;
    const questionCount =
      requested !== undefined && Number.isFinite(requested) ? requested : undefined;

    let started;
    try {
      started = await startAttempt({
        user,
        mode: mode as AttemptMode,
        groupId,
        questionCount,
      });
    } catch (error) {
      // Masalan "Imtihon uchun savollar yetarli emas" yoki noto'g'ri
      // savollar soni — bu yerda oq ekran o'rniga tushunarli sahifaga
      // qaytariladi. `redirect()` o'zi ham istisno tashlaydi, shuning
      // uchun uni catch ichida ushlab qolmaymiz.
      if (error instanceof AttemptError) {
        const backTo =
          mode === "EXAM"
            ? "/student/imtihon"
            : questionCount !== undefined
              ? "/student/maraton"
              : "/student/mashq";
        redirect(`${backTo}?xato=${encodeURIComponent(error.message)}`);
      }
      throw error;
    }

    redirect(`/student/test?attemptId=${started.attemptId}`);
  }

  redirect("/student");
}
