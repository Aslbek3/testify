import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  startAttempt,
  getAttemptForResume,
  AttemptError,
  EXAM_DURATION_SECONDS,
} from "@/services/attempts";
import { getStudentGroupId } from "@/services/studentDashboard";
import { TestRunner } from "./TestRunner";
import type { AttemptMode } from "@prisma/client";

const VALID_MODES: AttemptMode[] = ["PRACTICE", "EXAM"];

export default async function TestPage({
  searchParams,
}: {
  searchParams: Promise<{ attemptId?: string; mode?: string }>;
}) {
  const user = await requireRole("STUDENT");
  const { attemptId, mode } = await searchParams;

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

  // Yangi urinish — boshlab, kanonik URL'ga (attemptId bilan) yo'naltiramiz,
  // shunda keyingi refresh yangi urinish YARATMAYDI, davom ettiradi.
  if (mode && VALID_MODES.includes(mode as AttemptMode)) {
    const groupId = await getStudentGroupId(user.id);
    const started = await startAttempt({
      user,
      mode: mode as AttemptMode,
      groupId,
    });
    redirect(`/student/test?attemptId=${started.attemptId}`);
  }

  redirect("/student");
}
