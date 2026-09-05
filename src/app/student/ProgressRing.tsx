/**
 * Sof CSS conic-gradient asosidagi progress ring — chart kutubxonasisiz.
 * `score` null bo'lsa (hali urinish yo'q), 0% to'ldirilgan halqa "hali yo'q"
 * matni bilan ko'rsatiladi — bu "0% ball oldingiz" degani emas.
 */
export function ProgressRing({ score }: { score: number | null }) {
  const pct = score ?? 0;

  return (
    <div
      className="relative flex h-36 w-36 shrink-0 items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(var(--brand) calc(${pct} * 1%), var(--bg-subtle) 0)`,
      }}
    >
      <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-bg">
        {score === null ? (
          <span className="text-lg font-semibold text-text-muted">Hali yo&apos;q</span>
        ) : (
          <span className="font-mono text-3xl font-semibold tracking-tight text-text">
            {score}%
          </span>
        )}
      </div>
    </div>
  );
}
