import { Card, CardHeader, CardTitle, CardNote } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/Badge";
import { Icon } from "@/components/Icon";
import { LessonRowActions } from "@/components/LessonRowActions";
import { cn } from "@/lib/cn";
import { formatLessonDate, formatTime } from "@/lib/format";
import type { LessonRow } from "@/services/lessons";

/**
 * Guruhning yaqin darslari.
 *
 * Faqat KELAJAKDAGILARI ko'rsatiladi — o'tgan darslar ro'yxatni
 * uzaytiradi, lekin harakat talab qilmaydi. Ustozning savoli "keyingi
 * dars qachon?", "o'tgan oyda nima o'tdim?" emas.
 *
 * Bugungi dars alohida belgilanadi: jadvalni ochgan odam birinchi
 * navbatda shuni qidiradi.
 */
export function LessonScheduleCard({
  lessons,
  canManage,
  action,
  /** Bo'sh holatda nima qilish kerakligi — rolga qarab boshqa. */
  emptyHint,
}: {
  lessons: LessonRow[];
  /** Darsni bekor qilish tugmasi ko'rinadimi (`canManageLesson`). */
  canManage: boolean;
  /** "Jadval tuzish" tugmasi — ruxsati bor foydalanuvchi uchun. */
  action?: React.ReactNode;
  emptyHint?: string;
}) {
  // "Bugun" belgisi sanani SATR sifatida solishtirib aniqlanadi —
  // ikkalasi ham `formatLessonDate` dan o'tadi, ya'ni ikkalasi ham
  // O'zbekiston vaqtida. Lahzalarni solishtirish server vaqt mintaqasiga
  // bog'liq bo'lib qolardi.
  const todayLabel = formatLessonDate(new Date());

  return (
    <Card>
      <CardHeader>
        <CardTitle icon="calendar">Dars jadvali</CardTitle>
        <div className="flex items-center gap-2">
          {lessons.length > 0 && <CardNote>{lessons.length} ta yaqin dars</CardNote>}
          {action}
        </div>
      </CardHeader>

      {lessons.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="Jadval tuzilmagan"
          description={
            emptyHint ??
            "Dars jadvali tuzilsa, o'quvchilar keyingi darsni o'z panelida ko'radi va unga tayyorlanib keladi."
          }
        />
      ) : (
        <ul className="space-y-2">
          {lessons.map((lesson) => {
            const isToday = formatLessonDate(lesson.startsAt) === todayLabel;
            return (
              <li
                key={lesson.id}
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-md border-l-[3px] px-3.5 py-3",
                  isToday
                    ? "border-l-brand bg-brand-soft"
                    : "border-l-border bg-bg-subtle"
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    isToday ? "bg-brand text-white" : "bg-surface-2 text-text-muted"
                  )}
                >
                  <Icon name="calendar" className="h-5 w-5" />
                </span>

                <span className="min-w-[150px] flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-bold text-text">
                      {formatLessonDate(lesson.startsAt)}
                    </span>
                    {isToday && <Badge variant="brand">Bugun</Badge>}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-text-muted">
                    <span className="font-mono tabular-nums">
                      {formatTime(lesson.startsAt)}
                    </span>
                    {" · "}
                    {lesson.durationMin} daqiqa
                    {lesson.topicName && ` · ${lesson.topicName}`}
                    {lesson.note && ` · ${lesson.note}`}
                  </span>
                </span>

                {canManage && (
                  <LessonRowActions
                    lessonId={lesson.id}
                    lessonLabel={`${formatLessonDate(lesson.startsAt)} · ${formatTime(lesson.startsAt)}`}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
