import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getTopic, listQuestionsForTopic } from "@/services/questions";
import { LogoutButton } from "@/components/LogoutButton";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { NewQuestionModal } from "./NewQuestionModal";
import { QuestionsTable } from "./QuestionsTable";

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  await requireRole("OWNER");
  const { topicId } = await params;

  const topic = await getTopic(topicId);
  if (!topic) {
    notFound();
  }

  const questions = await listQuestionsForTopic(topicId);

  return (
    <main className="min-h-screen bg-bg-subtle p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <a
              href="/owner/questions"
              className="text-sm text-text-muted hover:text-text"
            >
              &larr; Mavzular ro&apos;yxatiga qaytish
            </a>
            <h1 className="mt-1 text-xl font-semibold text-text">{topic.name}</h1>
            <p className="mt-1 text-sm text-text-muted">
              Ushbu mavzuga tegishli savollarni shu yerdan qo&apos;shing, tahrirlang
              yoki o&apos;chiring.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NewQuestionModal topicId={topic.id} />
            <LogoutButton />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Savollar</CardTitle>
            <span className="text-sm text-text-muted">{questions.length} ta savol</span>
          </CardHeader>

          <QuestionsTable questions={questions} />
        </Card>
      </div>
    </main>
  );
}
