/**
 * Spinner emas — haqiqiy kontent shakliga mos bloklar.
 *
 * `.skeleton` (globals.css) `animate-pulse` o'rniga ishlatiladi: yorug'lik
 * chapdan o'ngga siljiydi. "O'chib-yonish" to'xtab qolgan ekran taassurotini
 * berardi, siljish esa ish ketayotganini ko'rsatadi.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="space-y-2.5">
        <div className="skeleton h-7 w-52 rounded-md" />
        <div className="skeleton h-4 w-80 max-w-full rounded-md" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="skeleton col-span-2 h-28 rounded-lg" />
        <div className="skeleton h-28 rounded-lg" />
        <div className="skeleton h-28 rounded-lg" />
      </div>

      <div className="skeleton h-64 rounded-lg" />
    </div>
  );
}
