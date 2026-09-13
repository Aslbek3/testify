import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { AssignmentList, type AssignmentListItem } from "@/components/AssignmentList";
import { describeAssignmentDue } from "@/lib/assignments";
import { formatDate } from "@/lib/format";
import type { GroupAssignment } from "@/services/assignments";

/**
 * Guruh vazifalari kartochkasi — ustoz paneli va direktorning guruh
 * sahifasi uchun umumiy. Server komponenti: sana va "necha kun qoldi"
 * shu yerda, bir marta hisoblanadi.
 */
export function GroupAssignmentsCard({
  assignments,
  canManage,
  action,
  hint,
}: {
  assignments: GroupAssignment[];
  canManage: boolean;
  /** Sarlavha yonidagi tugma (ustozda — "Vazifa berish"). */
  action?: ReactNode;
  hint?: string;
}) {
  const now = new Date();
  const items: AssignmentListItem[] = assignments.map((a) => ({
    id: a.id,
    title: a.title,
    note: a.note,
    dueDate: formatDate(a.dueAt),
    due: describeAssignmentDue(a.dueAt, now),
    targetCount: a.targetCount,
    completedCount: a.completedCount,
    students: a.students,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vazifalar</CardTitle>
        {action}
      </CardHeader>
      {hint && <p className="mb-3 text-sm text-text-muted">{hint}</p>}
      {items.length === 0 ? (
        <p className="text-sm text-text-muted">Hozircha vazifa berilmagan.</p>
      ) : (
        <AssignmentList items={items} canManage={canManage} />
      )}
    </Card>
  );
}
