import { requireActiveStudent } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardNote } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/Badge";
import { QuestionImage } from "@/components/QuestionImage";
import { QuestionActions } from "@/components/QuestionActions";
import { optionLetter } from "@/lib/questionOptions";
import { formatDate } from "@/lib/format";
import { listSavedQuestions } from "@/services/savedQuestions";

/**
 * "Saqlanganlar" — o'quvchi xatcho'p qo'ygan savollar.
 *
 * "Xatolarim" dan farqi: u XATO qilinganlarni avtomatik yig'adi, bu esa
 * o'quvchining o'zi tanlaganlarini. To'g'ri javob berilgan, lekin
 * tushunilmagan savol faqat shu yerda qoladi.
 *
 * Savol to'liq ochiq holda ko'rsatiladi (to'g'ri javob va izohi bilan) —
 * bu test emas, takrorlash ro'yxati. Test qilib berilsa, xatcho'pning
 * ma'nosi yo'qolardi: o'quvchi uni "yana bir marta O'QIB chiqish" uchun
 * qo'yadi.
 */
export default async function SavedQuestionsPage() {
  const user = await requireActiveStudent();
  const items = await listSavedQuestions(user.id);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Saqlanganlar"
        description="Test paytida xatcho'p qo'ygan savollaringiz — to'g'ri javobi va izohi bilan."
      />

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon="bookmark"
            title="Hali hech narsa saqlanmagan"
            description="Test yechayotganda savol ustidagi xatcho'p tugmasini bosing — savol shu yerga tushadi va keyin istalgan paytda qaytib ko'rasiz."
            action={{ href: "/student/mashq", label: "Mashqni boshlash" }}
          />
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle icon="bookmark">Saqlangan savollar</CardTitle>
            <CardNote>{items.length} ta savol</CardNote>
          </CardHeader>

          <ul className="space-y-4">
            {items.map((item) => (
              <li
                key={item.questionId}
                className="rounded-lg border border-border bg-bg p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge variant="neutral">{item.topicName}</Badge>
                    <p className="mt-2 font-display text-[15px] font-bold leading-snug text-text">
                      {item.text}
                    </p>
                  </div>
                  {/* Xatcho'pni shu yerdan ham olib tashlash mumkin —
                      ro'yxatni tozalash uchun boshqa sahifaga o'tish
                      kerak bo'lmasin. */}
                  <QuestionActions questionId={item.questionId} initiallySaved />
                </div>

                {item.imageUrl && (
                  <QuestionImage
                    src={item.imageUrl}
                    alt={item.imageAlt}
                    className="mt-3 h-48 w-full max-w-sm"
                  />
                )}

                <ul className="mt-3 space-y-1.5">
                  {item.options.map((option, index) => {
                    const isCorrect = index === item.correctOptionIndex;
                    return (
                      <li
                        key={index}
                        className={
                          isCorrect
                            ? "flex items-start gap-2 rounded-md bg-success-soft px-3 py-2 text-[13px] font-semibold text-text"
                            : "flex items-start gap-2 rounded-md px-3 py-2 text-[13px] text-text-muted"
                        }
                      >
                        <span className="font-mono text-[12px] text-text-faint">
                          {optionLetter(index)}
                        </span>
                        <span className="min-w-0 flex-1">{option}</span>
                        {isCorrect && (
                          <Icon name="check" className="h-4 w-4 shrink-0 text-success" />
                        )}
                      </li>
                    );
                  })}
                </ul>

                {item.explanation && (
                  <p className="mt-3 rounded-md bg-surface-2/70 px-3.5 py-3 text-[12.5px] leading-relaxed text-text-muted">
                    {item.explanation}
                    {item.legalReference && (
                      <span className="mt-1 block text-[11.5px] text-text-faint">
                        {item.legalReference}
                      </span>
                    )}
                  </p>
                )}

                <p className="mt-2.5 text-[11.5px] text-text-faint">
                  Saqlangan: {formatDate(item.savedAt)}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
