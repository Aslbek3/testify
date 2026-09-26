import type { SessionUser } from "@/types/auth";
import {
  AttemptError,
  MARATHON_MIN_QUESTIONS,
  startAttempt,
} from "@/services/attempts";
import { getStudentGroupId } from "@/services/studentDashboard";
import { listTrickyQuestions } from "@/services/questions";

/**
 * "Chalg'ituvchi" savollar mashqi.
 *
 * Savollar butun platformadagi javoblar statistikasidan tanlanadi —
 * ya'ni "sizga qiyin" emas, "KO'PCHILIKKA qiyin" savollar. O'quvchining
 * o'z xatolari alohida bo'limda ("Xatolarim").
 *
 * Rejim — mashq: izoh darhol ochiladi. Bu o'rganish vositasi.
 */
export async function startTrickyAttempt(input: {
  user: SessionUser;
}): Promise<{ attemptId: string }> {
  const tricky = await listTrickyQuestions();
  if (tricky.length < MARATHON_MIN_QUESTIONS) {
    throw new AttemptError(
      `Chalg'ituvchi savollar yetarli emas: kamida ${MARATHON_MIN_QUESTIONS} ta kerak, hozir ${tricky.length} ta. Ko'proq imtihon topshirilgach ro'yxat to'ladi.`,
      404
    );
  }

  const questionIds = tricky.map((q) => q.questionId);
  const started = await startAttempt({
    user: input.user,
    mode: "PRACTICE",
    groupId: await getStudentGroupId(input.user.id),
    questionIds,
    questionCount: questionIds.length,
  });
  return { attemptId: started.attemptId };
}
