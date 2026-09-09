import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  getTopic,
  listQuestionsForTopic,
  getQuestionQualityForTopic,
} from "@/services/questions";
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

  // Savollar ro'yxati va ularning xato foizi parallel olinadi — sifat
  // statistikasi bitta qo'shimcha (mavzu bo'yicha guruhlangan) so'rov,
  // savol boshiga alohida so'rov emas.
  const [questions, qualityByQuestionId] = await Promise.all([
    listQuestionsForTopic(topicId),
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
          <h1 className="mt-1 text-xl font-semibold text-text">{topic.name}</h1>
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
          <span className="text-sm text-text-muted">{questions.length} ta savol</span>
        </CardHeader>

        <QuestionsTable
          questions={questions}
          qualityByQuestionId={qualityByQuestionId}
        />
      </Card>
    </div>
  );
}
