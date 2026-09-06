import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";

export default async function StartAttemptPage() {
  await requireRole("STUDENT");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Test boshlash</h1>
        <p className="mt-1 text-sm text-text-muted">Rejimni tanlang.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mashq rejimi</CardTitle>
        </CardHeader>
        <p className="text-sm text-text-muted">
          10 ta savol. Har bir javobdan so&apos;ng to&apos;g&apos;ri javob va izoh
          darhol ko&apos;rsatiladi. Vaqt cheklovi yo&apos;q.
        </p>
        <Link href="/student/test?mode=PRACTICE" className="mt-4 inline-block">
          <Button type="button">Mashqni boshlash</Button>
        </Link>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Imtihon rejimi</CardTitle>
        </CardHeader>
        <p className="text-sm text-text-muted">
          20 ta savol, 25 daqiqa. Javoblar faqat yakunlangandan keyin
          ko&apos;rsatiladi. O&apos;tish balli — 90% (18/20).
        </p>
        <Link href="/student/test?mode=EXAM" className="mt-4 inline-block">
          <Button type="button">Imtihonni boshlash</Button>
        </Link>
      </Card>
    </div>
  );
}
