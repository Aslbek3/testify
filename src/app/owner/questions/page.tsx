import Link from "next/link";
import { requireRole } from "@/lib/auth";
import {
  listTopicsWithQuestionCount,
  listLowQualityQuestions,
  MIN_ANSWERS_FOR_QUALITY,
} from "@/services/questions";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Badge } from "@/components/Badge";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from "@/components/Table";
import { NewTopicModal } from "./NewTopicModal";

export default async function QuestionBankPage() {
  await requireRole("OWNER");
  const [topics, lowQualityQuestions] = await Promise.all([
    listTopicsWithQuestionCount(),
    listLowQualityQuestions(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Savollar bazasi</h1>
          <p className="mt-1 text-sm text-text-muted">
            Bu yerda barcha tashkilotlar foydalanadigan umumiy mavzular va
            savollar boshqariladi.
          </p>
        </div>
        <NewTopicModal />
      </div>

      <Card>
          <CardHeader>
            <CardTitle>Mavzular</CardTitle>
            <span className="text-sm text-text-muted">{topics.length} ta mavzu</span>
          </CardHeader>

          {topics.length === 0 ? (
            <p className="text-sm text-text-muted">
              Hozircha birorta mavzu qo&apos;shilmagan.
            </p>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Mavzu</TableHeaderCell>
                  <TableHeaderCell align="right">Savollar soni</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topics.map((topic) => (
                  <TableRow key={topic.id} clickable>
                    <TableCell className="!p-0">
                      <Link
                        href={`/owner/questions/${topic.id}`}
                        className="block px-3 py-3 font-medium"
                      >
                        {topic.name}
                      </Link>
                    </TableCell>
                    <TableCell className="!p-0" align="right">
                      <Link
                        href={`/owner/questions/${topic.id}`}
                        className="block px-3 py-3"
                      >
                        {topic.questionCount}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        )}
      </Card>

      {/* Kontent sifati signali: savolni owner yozadi, demak "hamma
          qoqiladigan" savolni ham u ko'rishi kerak. Ustoz panelidagi
          ro'yxat faqat bitta guruh bo'yicha — bu esa butun platforma
          bo'yicha. */}
      <Card>
        <CardHeader>
          <CardTitle>Xato foizi eng yuqori savollar</CardTitle>
          <span className="text-sm text-text-muted">
            Kamida {MIN_ANSWERS_FOR_QUALITY} ta javob bo&apos;lganlar
          </span>
        </CardHeader>

        <p className="mb-3 text-sm text-text-muted">
          Deyarli hamma xato qiladigan savol — ko&apos;pincha qiyin savol
          emas, balki matni ikki ma&apos;noli yoki to&apos;g&apos;ri javobi
          noto&apos;g&apos;ri belgilangan savol. Foiz yakunlangan
          imtihonlardagi javoblar bo&apos;yicha hisoblanadi (mashq rejimi
          sanalmaydi — u yerda javob darhol ko&apos;rsatiladi).
        </p>

        {lowQualityQuestions.length === 0 ? (
          <p className="text-sm text-text-muted">
            Hozircha yetarli ma&apos;lumot yo&apos;q — savol ro&apos;yxatga
            kirishi uchun unga yakunlangan imtihonlarda kamida{" "}
            {MIN_ANSWERS_FOR_QUALITY} marta javob berilgan bo&apos;lishi kerak.
          </p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Savol</TableHeaderCell>
                <TableHeaderCell>Mavzu</TableHeaderCell>
                <TableHeaderCell align="right">Javoblar</TableHeaderCell>
                <TableHeaderCell align="right">Xato foizi</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lowQualityQuestions.map((question) => (
                <TableRow key={question.questionId} clickable>
                  {/* Butun qator mavzu sahifasiga olib boradi — owner
                      savolni o'sha yerda tahrirlaydi. Matn CSS bilan
                      kesiladi (`line-clamp`), JS bilan emas: qirqish
                      mantig'i jadval komponentida allaqachon bor va
                      ikkinchi nusxasi kerak emas. */}
                  <TableCell className="!p-0 max-w-md">
                    <Link
                      href={`/owner/questions/${question.topicId}`}
                      className="block px-3 py-3"
                    >
                      <span className="line-clamp-2">{question.questionText}</span>
                    </Link>
                  </TableCell>
                  <TableCell>{question.topicName}</TableCell>
                  <TableCell align="right">{question.answerCount}</TableCell>
                  <TableCell align="right">
                    <div className="flex items-center justify-end gap-2">
                      {question.needsReview && (
                        <Badge variant="danger">Tekshirish kerak</Badge>
                      )}
                      <span className="font-mono font-semibold">
                        {question.wrongPercent}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
