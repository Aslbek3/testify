import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/cn";
import { countUrgent, type RoleTask, type TaskSeverity } from "@/lib/tasks";

/**
 * "Bugungi ish" ro'yxati — barcha rollar uchun BITTA komponent.
 * Rolga qarab farq qiladigani faqat ro'yxatning o'zi (`services/tasks.ts`).
 *
 * Uchta dizayn qarori ataylab:
 *
 * 1. Daraja CHAP CHIZIQ bilan beriladi, faqat rang bilan emas — rangni
 *    ajrata olmaydigan foydalanuvchi ham chiziqning borligidan va
 *    yorliqning matnidan tushunadi.
 * 2. FAQAT BITTA to'ldirilgan tugma — eng shoshilinch ishda. Qolganlari
 *    oq. To'rttasi ham rangli bo'lsa ko'z qayerga qarashni bilmaydi.
 * 3. Bo'sh bo'lsa ham CHIZILADI. Aksariyat kunlari ro'yxat bo'sh bo'ladi;
 *    blok yo'qolib qolsa sahifa har safar boshqacha joylashadi va
 *    foydalanuvchi "yuklanmadimi?" deb o'ylaydi.
 */

const STRIPE: Record<TaskSeverity, string> = {
  urgent: "border-l-danger",
  attention: "border-l-warning",
  info: "border-l-info",
};

const CIRCLE: Record<TaskSeverity, string> = {
  urgent: "bg-danger-soft text-danger",
  attention: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
};

export function TaskCard({
  tasks,
  /** O'quvchida bu "ish" emas, "tavsiya" — shuning uchun sarlavha boshqa. */
  title = "Bugungi ish",
  emptyTitle = "Hammasi joyida",
  emptyDescription = "Hozir hal qilinishi kerak bo'lgan ish yo'q.",
  className,
}: {
  tasks: RoleTask[];
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}) {
  const urgentCount = countUrgent(tasks);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle icon="target">{title}</CardTitle>
        {tasks.length > 0 && (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-bold",
              urgentCount > 0
                ? "bg-danger-soft text-danger"
                : "bg-surface-2 text-text-muted"
            )}
          >
            {urgentCount > 0 ? `${urgentCount} ta shoshilinch` : `${tasks.length} ta`}
          </span>
        )}
      </CardHeader>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-2.5 py-7 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Icon name="check" className="h-6 w-6" />
          </span>
          <p className="font-display text-[15px] font-bold text-text">{emptyTitle}</p>
          <p className="max-w-sm text-[13px] leading-relaxed text-text-muted">
            {emptyDescription}
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {tasks.map((task, index) => (
            <li
              key={task.id}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-md border-l-[3px] bg-bg-subtle px-3.5 py-3",
                STRIPE[task.severity]
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  CIRCLE[task.severity]
                )}
              >
                <Icon name={task.icon} className="h-5 w-5" />
              </span>

              <div className="min-w-[160px] flex-1">
                <p className="text-[13.5px] font-bold leading-snug text-text">
                  {task.title}
                </p>
                {task.detail && (
                  <p className="mt-0.5 text-[12px] leading-snug text-text-muted">
                    {task.detail}
                  </p>
                )}
              </div>

              {/* Telefonda tugma o'z qatoriga tushadi va to'liq kenglikni
                  egallaydi — 390px da sarlavha bilan yonma-yon turolmaydi. */}
              <Link
                href={task.href}
                className="w-full shrink-0 sm:w-auto"
                aria-label={`${task.title} — ${task.action}`}
              >
                <Button
                  type="button"
                  size="sm"
                  variant={index === 0 ? "primary" : "secondary"}
                  className="w-full"
                >
                  {task.action}
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
