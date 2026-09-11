import { Badge } from "@/components/Badge";
import type { StudentAccessLabel } from "@/lib/labels";

/** O'quvchining to'lov holati katagi — direktor va ustoz jadvallarida. */
export function StudentAccessBadge({ status }: { status: StudentAccessLabel | undefined }) {
  if (!status) return <>—</>;
  return (
    <>
      <Badge variant={status.variant}>{status.label}</Badge>
      {status.detail && (
        <span className="mt-1 block text-xs text-text-muted">{status.detail}</span>
      )}
    </>
  );
}
