import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { ATTENTION_LABEL, type AttentionItem } from "@/lib/attention";

/**
 * "Diqqat talab qiladi" — guruh sahifasidagi birinchi blok.
 *
 * Bo'sh bo'lsa ham CHIZILADI: "hamma joyida" degan xabar ham ustozga
 * kerakli ma'lumot. Aks holda ustoz blokni ko'rmay, "yuklanmadimi?" deb
 * o'ylashi mumkin.
 */
export function AttentionCard({
  items,
  /** Ism bosilganda ochiladigan sahifa: ustozda o'quvchi sahifasi bor. */
  studentHref,
}: {
  items: AttentionItem[];
  studentHref?: (studentId: string) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Diqqat talab qiladi</CardTitle>
        <span className="text-sm text-text-muted">
          {items.length > 0 ? `${items.length} ta o'quvchi` : "Hammasi joyida"}
        </span>
      </CardHeader>

      {items.length === 0 ? (
        <p className="text-sm text-text-muted">
          Guruhda uzoq vaqt kirmagan yoki bali past o&apos;quvchi yo&apos;q.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => {
            const row = (
              <span className="flex flex-wrap items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-text">
                    {item.name}
                  </span>
                  <span className="block text-sm text-text-muted">{item.detail}</span>
                </span>
                <Badge variant={item.reason === "inactive" ? "danger" : "warning"}>
                  {ATTENTION_LABEL[item.reason]}
                </Badge>
              </span>
            );
            return (
              <li key={item.studentId} className="py-3 first:pt-0 last:pb-0">
                {studentHref ? (
                  <Link href={studentHref(item.studentId)} className="block hover:underline">
                    {row}
                  </Link>
                ) : (
                  row
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
