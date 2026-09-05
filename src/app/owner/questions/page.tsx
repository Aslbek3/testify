import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { listTopicsWithQuestionCount } from "@/services/questions";
import { LogoutButton } from "@/components/LogoutButton";
import { Card, CardHeader, CardTitle } from "@/components/Card";
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
  const topics = await listTopicsWithQuestionCount();

  return (
    <main className="min-h-screen bg-bg-subtle p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <a href="/owner" className="text-sm text-text-muted hover:text-text">
              &larr; Owner paneliga qaytish
            </a>
            <h1 className="mt-1 text-xl font-semibold text-text">
              Savollar bazasi
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Bu yerda barcha tashkilotlar foydalanadigan umumiy mavzular va
              savollar boshqariladi.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NewTopicModal />
            <LogoutButton />
          </div>
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
      </div>
    </main>
  );
}
