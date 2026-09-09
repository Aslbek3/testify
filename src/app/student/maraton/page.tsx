import Link from "next/link";
import { requireRole } from "@/lib/auth";
import {
  countAvailableQuestions,
  MARATHON_MIN_QUESTIONS,
  MARATHON_MAX_QUESTIONS,
} from "@/services/attempts";
import { ModeStartCard } from "../ModeStartCard";

/**
 * Taklif qilinadigan savol sonlari. Bazadagi savollar sonidan oshib
 * ketganlari ko'rsatilmaydi — "100 ta savol" tugmasini bosgan o'quvchi 60 ta
 * savol olsa, bu yolg'on va'da bo'lardi.
 */
const SIZE_OPTIONS = [10, 20, 50, 100, MARATHON_MAX_QUESTIONS];

export default async function MaratonPage({
  searchParams,
}: {
  searchParams: Promise<{ xato?: string }>;
}) {
  await requireRole("STUDENT");
  const { xato } = await searchParams;

  const available = await countAvailableQuestions();

  const sizes = SIZE_OPTIONS.filter(
    (size) => size >= MARATHON_MIN_QUESTIONS && size <= available
  );
  // "Hammasi" — bazadagi barcha savollar. Ro'yxatdagi son bilan bir xil
  // bo'lib qolmasligi uchun tekshiriladi (masalan bazada aynan 50 ta savol
  // bo'lsa, "50" va "Hammasi (50)" ikki marta chiqmasin).
  const showAll =
    available >= MARATHON_MIN_QUESTIONS &&
    available <= MARATHON_MAX_QUESTIONS &&
    !sizes.includes(available);

  const tooFewQuestions = available < MARATHON_MIN_QUESTIONS;

  return (
    <ModeStartCard
      title="Maraton"
      description="Uzoq mashq: savollar sonini o'zingiz tanlaysiz, vaqt cheklovi yo'q."
      error={xato}
      rules={[
        "Savollar soni tanlanadi, savollar butun bazadan tasodifiy olinadi.",
        "Vaqt cheklovi yo'q — istalgan paytda yakunlash mumkin.",
        "Mashqdagi kabi: javobdan keyin to'g'ri javob va izoh darhol ochiladi.",
        "Natija o'rtacha ballga kirmaydi — bu mashq, imtihon emas.",
      ]}
      action={
        tooFewQuestions ? (
          <p className="text-sm text-text-muted">
            Maraton uchun bazada kamida {MARATHON_MIN_QUESTIONS} ta savol
            bo&apos;lishi kerak. Hozir {available} ta.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-text">Nechta savol?</p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => (
                <Link
                  key={size}
                  href={`/student/test?mode=PRACTICE&savollar=${size}`}
                  className="rounded-md border border-border px-4 py-3 text-sm font-medium pointer-fine:py-2 text-text hover:bg-bg-subtle"
                >
                  {size} ta
                </Link>
              ))}
              {showAll && (
                <Link
                  href={`/student/test?mode=PRACTICE&savollar=${available}`}
                  className="rounded-md border border-brand bg-brand-soft px-4 py-3 text-sm font-medium pointer-fine:py-2 text-brand hover:bg-brand-soft/70"
                >
                  Hammasi ({available} ta)
                </Link>
              )}
            </div>
          </div>
        )
      }
    />
  );
}
