import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  getTopic,
  listQuestionsForTopic,
  getQuestionQualityForTopic,
} from "@/services/questions";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { JournalSearch } from "@/components/JournalToolbar";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { NewQuestionModal } from "./NewQuestionModal";
import { QuestionsTable } from "./QuestionsTable";

export default async function TopicDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ topicId: string }>;
  searchParams: Promise<{ q?: string; sahifa?: string }>;
}) {
  await requireRole("OWNER");
  const { topicId } = await params;
  const { q, sahifa } = await searchParams;
  const search = q?.trim() ?? "";
  const requestedPage = Number(sahifa);

  const topic = await getTopic(topicId);
  if (!topic) {
    notFound();
  }

  // Savollar ro'yxati va ularning xato foizi parallel olinadi — sifat
  // statistikasi bitta qo'shimcha (mavzu bo'yicha guruhlangan) so'rov,
  // savol boshiga alohida so'rov emas.
  const [questionPage, qualityByQuestionId] = await Promise.all([
    listQuestionsForTopic(topicId, {
      page: Number.isFinite(requestedPage) ? requestedPage : 1,
      search,
    }),
    getQuestionQualityForTopic(topicId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/owner/questions"
            className="text-sm text-text-muted hover:text-text"
          >
            &larr; Mavzular ro&apos;yxatiga qaytish
          </Link>
          <h1 className="mt-1 font-display text-[26px] font-bold tracking-[-0.04em] text-text sm:text-[30px]">
            {topic.name}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Ushbu mavzuga tegishli savollarni shu yerdan qo&apos;shing, tahrirlang
            yoki o&apos;chiring.
          </p>
        </div>
        <NewQuestionModal topicId={topic.id} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Savollar</CardTitle>
          <span className="text-sm text-text-muted">
            {questionPage.total} ta savol
          </span>
        </CardHeader>

        {/* Qidiruv sahifalashdan OLDIN: yangi qidiruv boshlanganda
            sahifa raqami saqlanmaydi (`keepParams` da yo'q), ya'ni
            natija doim birinchi sahifadan boshlanadi. */}
        <div className="mb-4">
          <JournalSearch
            basePath={`/owner/questions/${topic.id}`}
            defaultValue={search}
            placeholder="Savol matni bo'yicha qidirish"
          />
        </div>

        {questionPage.items.length === 0 ? (
          <EmptyState
            icon={search ? "search" : "book"}
            title={search ? "Hech narsa topilmadi" : "Bu mavzuda savol yo'q"}
            description={
              search
                ? `"${search}" bo'yicha savol topilmadi. Boshqa so'z bilan qidirib ko'ring.`
                : "Yuqoridagi \"Yangi savol\" tugmasi orqali birinchi savolni qo'shing yoki import qiling."
            }
            action={
              search
                ? { href: `/owner/questions/${topic.id}`, label: "Qidiruvni tozalash" }
                : undefined
            }
          />
        ) : (
          <>
            <QuestionsTable
              questions={questionPage.items}
              qualityByQuestionId={qualityByQuestionId}
            />
            <div className="mt-4">
              <Pagination
                page={questionPage.page}
                pageCount={questionPage.pageCount}
                total={questionPage.total}
                basePath={`/owner/questions/${topic.id}`}
                keepParams={{ q: search || undefined }}
                itemLabel="savol"
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
