import { cn } from "@/lib/cn";

/** Katta statistik ko'rsatkich uchun — jadval qatoridan ataylab kattaroq. */
export function StatTile({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: string | number;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-bg p-5", className)}>
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-text">
        {value}
      </p>
      {sub && <p className="mt-1 text-sm text-text-muted">{sub}</p>}
    </div>
  );
}
