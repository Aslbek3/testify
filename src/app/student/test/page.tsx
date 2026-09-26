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
import { startMistakesAttempt } from "@/services/mistakes";
import { startTicketAttempt } from "@/services/tickets";
import { startNumericAttempt } from "@/services/numericQuestions";
import { parseMistakeSources, parseTopicIds } from "@/lib/mistakeFilters";
import { EXAM_MAX_WRONG } from "@/lib/examRules";
import { TestRunner } from "./TestRunner";
import type { AttemptMode } from "@prisma/client";

const VALID_MODES: AttemptMode[] = ["PRACTICE", "EXAM"];

export default async function TestPage({
  searchParams,
}: {
  searchParams: Promise<{
    attemptId?: string;
    mode?: string;
    savollar?: string;
    vazifa?: string;
    xatolar?: string;
    bilet?: string;
    /** Raqamli savollar mashqi — `1` bo'lsa shu rejim boshlanadi. */
    raqamli?: string;
    /** Mavzu bo'yicha mashq — "keyingi qadam" tavsiyasi shu havolani beradi. */
    mavzuMashq?: string;
    manba?: string;
    mavzu?: string;
  }>;
}) {
  const user = await requireActiveStudent();
  const { attemptId, mode, savollar, vazifa, xatolar, manba, mavzu, bilet, raqamli } =
    await searchParams;
  // `mavzu` ikki joyda ishlatiladi: xatolar filtrida (yuqoridagi) va oddiy
  // mashqda mavzu tanlashda (quyida) — ikkalasi bir-biriga xalaqit bermaydi,
  // chunki ular boshqa-boshqa shart ichida ishlaydi.
  const topicIds = mavzu ? mavzu.split(",").filter(Boolean) : undefined;

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

    return (
      <TestRunner
        attempt={resumed}
        examDurationSeconds={EXAM_DURATION_SECONDS}
        maxWrong={EXAM_MAX_WRONG}
      />
    );
  }

  // Bilet — savollar va ularning tartibi biletning o'zidan.
  if (bilet) {
    let started;
    try {
      started = await startTicketAttempt({ user, ticketNumber: Number(bilet) });
    } catch (error) {
      if (error instanceof AttemptError) {
        redirect(`/student/bilet?xato=${encodeURIComponent(error.message)}`);
      }
      throw error;
    }
    redirect(`/student/test?attemptId=${started.attemptId}`);
  }

  // Raqamli savollar — savollar ro'yxatini shartning o'zi belgilaydi.
  if (raqamli) {
    let started;
    try {
      started = await startNumericAttempt({ user });
    } catch (error) {
      if (error instanceof AttemptError) {
        redirect(`/student/raqamli?xato=${encodeURIComponent(error.message)}`);
      }
      throw error;
    }
    redirect(`/student/test?attemptId=${started.attemptId}`);
  }

  // Xatolar ustida ishlash — savollar ro'yxatini "Xatolarim" filtri
  // belgilaydi (URL'dagi filtr aynan o'sha sahifadagidek qo'llanadi).
  if (xatolar) {
    let started;
    try {
      started = await startMistakesAttempt({
        user,
        filters: { sources: parseMistakeSources(manba), topicIds: parseTopicIds(mavzu) },
      });
    } catch (error) {
      if (error instanceof AttemptError) {
        redirect(`/student/xatolarim?xato=${encodeURIComponent(error.message)}`);
      }
      throw error;
    }
    redirect(`/student/test?attemptId=${started.attemptId}`);
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
        topicIds: mode === "EXAM" ? undefined : topicIds,
        // Maraton alohida rejim emas (mashqning varianti) — uni faqat
        // savollar soni tanlanganidan bilamiz. `source` shu farqni saqlab
        // qoladi, "Xatolarim" filtri esa shunga tayanadi.
        source:
          mode === "EXAM" ? "EXAM" : questionCount !== undefined ? "MARATHON" : "PRACTICE",
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
