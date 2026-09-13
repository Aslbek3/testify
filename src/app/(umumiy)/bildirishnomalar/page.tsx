import Link from "next/link";
import { requireAnySession } from "@/lib/auth";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { cn } from "@/lib/cn";
import { describeAssignmentDue } from "@/lib/assignments";
import { formatDateTime } from "@/lib/format";
import { listNotifications, type NotificationItem } from "@/services/notifications";
import { listAssignmentsForStudent } from "@/services/assignments";
import { MarkNotificationsRead } from "./MarkNotificationsRead";

export default async function NotificationsPage() {
  const user = await requireAnySession();
  const now = new Date();

  const [notifications, assignments] = await Promise.all([
    listNotifications(user.id),
    user.role === "STUDENT" ? listAssignmentsForStudent(user.id, now) : [],
  ]);

  // Muddat eslatmalari bazaga yozilmaydi (`schema.prisma` dagi
  // `Notification` izohiga qara) — shu yerda, ochilgan paytda hisoblanadi:
  // bajarilmagan va bugun yoki ertaga tugaydigan vazifalar ("Bugun" /
  // "Ertaga" belgisi aynan shu holat — `describeAssignmentDue`).
  const dueSoon = assignments.filter(
    (a) => !a.isDone && !a.isOverdue && describeAssignmentDue(a.dueAt, now).variant === "warning"
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      {unreadCount > 0 && <MarkNotificationsRead />}

      <div>
        <h1 className="text-xl font-semibold text-text">Bildirishnomalar</h1>
        <p className="mt-1 text-sm text-text-muted">
          {unreadCount > 0
            ? `${unreadCount} ta yangi bildirishnoma`
            : "Yangi bildirishnoma yo'q"}
        </p>
      </div>

      {dueSoon.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Muddati yaqin vazifalar</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-border">
            {dueSoon.map((a) => {
              const due = describeAssignmentDue(a.dueAt, now);
              return (
                <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    href="/student"
                    className="flex flex-wrap items-center justify-between gap-3 hover:underline"
                  >
                    <span className="text-sm font-medium text-text">{a.title}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-sm tabular-nums text-text-muted">
                        {a.doneCount} / {a.targetCount}
                      </span>
                      <Badge variant={due.variant}>{due.label}</Badge>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card>
        {notifications.length === 0 ? (
          <p className="text-sm text-text-muted">Hozircha bildirishnoma yo&apos;q.</p>
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map((n) => (
              <li key={n.id} className="py-3 first:pt-0 last:pb-0">
                <NotificationRow notification={n} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function NotificationRow({ notification: n }: { notification: NotificationItem }) {
  const content = (
    <div className="flex items-start gap-3">
      {/* Yangi belgisi — faqat rang bilan emas, ekran o'quvchisi uchun matn
          bilan ham. */}
      <span
        className={cn(
          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
          n.isRead ? "bg-transparent" : "bg-brand"
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className={cn("text-sm text-text", !n.isRead && "font-semibold")}>
          {!n.isRead && <span className="sr-only">Yangi: </span>}
          {n.title}
        </p>
        {n.body && <p className="text-sm text-text-muted">{n.body}</p>}
        <p className="font-mono text-xs tabular-nums text-text-muted">
          {formatDateTime(n.createdAt)}
        </p>
      </div>
    </div>
  );

  if (!n.link) return content;
  return (
    <Link href={n.link} className="-mx-2 block rounded-md px-2 py-1 hover:bg-bg-subtle">
      {content}
    </Link>
  );
}
