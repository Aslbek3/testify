import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { Button } from "@/components/Button";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { StatTile } from "@/components/StatTile";
import { getStudentMistakes } from "@/services/mistakes";
import { finalizeExpiredAttempts } from "@/services/attempts";
import { MistakesList } from "./MistakesList";

export default async function StudentMistakesPage() {
  const user = await requireRole("STUDENT");

  // Panel bilan bir xil "yalqov" yakunlash: yorliq yopilib tashlab ketilgan
  // imtihonni server tomonda hech kim yopmaydi, u esa `finishedAt: null`
  // bo'lgani uchun bu ro'yxatga tushmaydi. Ma'lumotni O'QISHDAN OLDIN
  // turishi shart, aks holda endigina yopilgan urinishning xatolari shu
  // sahifada faqat keyingi ochilishda paydo bo'lardi.
  await finalizeExpiredAttempts(user.id);

  const mistakes = await getStudentMistakes(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Xatolarim</h1>
          {/* ⚠️ Ma'lumot manbai ATAYLAB ochiq yozilgan. Panel statistikasi
              faqat IMTIHON urinishlari bo'yicha hisoblanadi, bu ro'yxat esa
              mashqni ham qo'shadi — manba yozilmasa o'quvchi ikki ekrandagi
              raqamlarni solishtirib, birini xato deb o'ylaydi. */}
          <p className="mt-1 text-sm text-text-muted">
            Barcha yakunlangan urinishlar bo&apos;yicha — mashq ham, imtihon ham.
            Javobsiz qoldirilgan savollar bu ro&apos;yxatga kirmaydi.
          </p>
        </div>
        <Link href="/student/boshlash">
          <Button type="button">Test boshlash</Button>
        </Link>
      </div>

      {!mistakes.hasFinishedAttempt ? (
        // Bo'sh holatning BIRINCHI sababi: hali test yechilmagan. O'quvchiga
        // "xatoyingiz yo'q" deyish yolg'on bo'lardi — hali o'lchanmagan.
        <Card>
          <p className="text-sm text-text-muted">
            Hali birorta test yakunlanmagan. Mashq yoki imtihonni yakunlaganingizdan
            so&apos;ng xato qilgan savollaringiz shu yerda to&apos;planadi.
          </p>
        </Card>
      ) : mistakes.items.length === 0 ? (
        // IKKINCHI sabab: test yechilgan, lekin birorta xato yo'q.
        <Card>
          <p className="text-sm text-text-muted">
            Yakunlangan urinishlaringizda birorta xato yo&apos;q. Ajoyib natija —
            yangi test yechib, bilimingizni tekshirib turing.
          </p>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Qisqacha xulosa</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 gap-4 sm:max-w-md">
              <StatTile
                label="Hali xato"
                value={mistakes.stillWrongCount}
                sub="oxirgi javob noto'g'ri"
              />
              <StatTile
                label="Tuzatilgan"
                value={mistakes.fixedCount}
                sub="oxirgi javob to'g'ri"
              />
            </div>
          </Card>

          <Card>
            <MistakesList items={mistakes.items} />
          </Card>
        </>
      )}
    </div>
  );
}
