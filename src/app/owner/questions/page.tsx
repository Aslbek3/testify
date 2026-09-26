import { Fragment } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import {
  listTopicsWithQuestionCount,
  groupTopicsByCategory,
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
import { listOpenReports } from "@/services/questionReports";
import { formatDate } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { ReportActions } from "./ReportActions";
import { NewTopicModal } from "./NewTopicModal";
import { ImportQuestionsModal } from "./ImportQuestionsModal";

export default async function QuestionBankPage() {
  await requireRole("OWNER");
  const [topics, lowQualityQuestions, reports] = await Promise.all([
    listTopicsWithQuestionCount(),
    listLowQualityQuestions(),
    listOpenReports(),
  ]);
  const topicGroups = groupTopicsByCategory(topics);
  // Mavjud guruh nomlari — yangi mavzu oynasidagi taklif ro'yxati uchun.
  const categories = topicGroups
    .map((g) => g.category)
    .filter((c): c is string => c !== null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[26px] font-bold tracking-[-0.04em] text-text sm:text-[30px]">
            Savollar bazasi
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Bu yerda barcha tashkilotlar foydalanadigan umumiy mavzular va
            savollar boshqariladi.
          </p>
        </div>
        <ImportQuestionsModal />
          <NewTopicModal categories={categories} />
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
                {topicGroups.map((group) => (
                  <Fragment key={group.category ?? "guruhsiz"}>
                    {/* Guruh sarlavhasi jadval ICHIDA: ro'yxat 20 tadan
                        oshganda tekis alifbo tartibi o'qib bo'lmaydigan
                        bo'lib qoladi — bir-biriga tegishli mavzular
                        ajralib ketadi. Guruhsizlar oxirida. */}
                    {topicGroups.length > 1 && (
                      <TableRow>
                        <TableCell className="bg-surface-2/60 !py-2 text-[12px] font-bold text-text-muted">
                          {group.category ?? "Boshqa"}
                        </TableCell>
                        <TableCell
                          align="right"
                          data-label="Savollar soni"
                          className="bg-surface-2/60 !py-2 text-[12px] font-semibold text-text-faint"
                        >
                          {group.questionCount}
                        </TableCell>
                      </TableRow>
                    )}
                    {group.topics.map((topic) => (
                      <TableRow key={topic.id} clickable>
                        <TableCell className="!p-0">
                          <Link
                            href={`/owner/questions/${topic.id}`}
                            className="block px-3 py-3 font-medium"
                          >
                            {topic.name}
                          </Link>
                        </TableCell>
                        <TableCell className="!p-0" align="right" data-label="Savollar soni">
                          <Link
                            href={`/owner/questions/${topic.id}`}
                            className="block px-3 py-3"
                          >
                            {topic.questionCount}
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
        )}
      </Card>

      {/* Shikoyatlar sifat statistikasidan YUQORIDA: statistika
          "ehtimol xato" deydi, shikoyat esa odamning aniq gapi va
          javob kutadi. */}
      <Card>
        <CardHeader>
          <CardTitle>Savolga shikoyatlar</CardTitle>
          <span className="text-sm text-text-muted">
            {reports.length > 0 ? `${reports.length} ta ko'rilmagan` : "Hammasi ko'rilgan"}
          </span>
        </CardHeader>

        <p className="mb-3 text-sm text-text-muted">
          O&apos;quvchi yoki ustoz &quot;bu savol noto&apos;g&apos;ri&quot; deb
          belgilagan savollar. Pastdagi statistikadan farqi: u ehtimollik,
          bu esa aniq gap. Ikkalasi bitta savolga ko&apos;rsatsa — savol
          deyarli aniq xato.
        </p>

        {reports.length === 0 ? (
          <EmptyState
            icon="check"
            title="Ko'rilmagan shikoyat yo'q"
            description="O'quvchi test paytida savol ustidagi bayroqcha tugmasini bossa, shikoyat shu yerda paydo bo'ladi."
          />
        ) : (
          <ul className="space-y-3">
            {reports.map((report) => (
              <li
                key={report.id}
                className="rounded-lg border border-border bg-bg p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge variant="neutral">{report.topicName}</Badge>
                    <Link
                      // Savolning alohida sahifasi yo'q — mavzu
                      // sahifasida barcha savollari ro'yxati bor.
                      href={`/owner/questions/${report.topicId}`}
                      className="mt-2 block text-[14px] font-semibold text-text underline-offset-2 hover:underline"
                    >
                      {report.questionText}
                    </Link>
                    {report.reason && (
                      <p className="mt-2 rounded-md bg-surface-2/70 px-3 py-2 text-[12.5px] leading-relaxed text-text-muted">
                        &laquo;{report.reason}&raquo;
                      </p>
                    )}
                    <p className="mt-2 text-[11.5px] text-text-faint">
                      {report.reporterName} · {formatDate(report.createdAt)}
                    </p>
                  </div>
                  <ReportActions reportId={report.id} />
                </div>
              </li>
            ))}
          </ul>
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
                  <TableCell data-label="Mavzu">{question.topicName}</TableCell>
                  <TableCell align="right" data-label="Javoblar">
                    {question.answerCount}
                  </TableCell>
                  <TableCell align="right" data-label="Xato foizi">
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
