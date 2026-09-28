/**
 * Ogohlantirish uchburchagi — test ekranidagi "saqlanmadi" xabarlari.
 *
 * Alohida faylda, chunki uni `TestRunner.tsx` ham, `TestModals.tsx` ham
 * ishlatadi. Bittasining ichida tursa, ikkalasi bir-birini aylanma
 * import qilib qolardi.
 *
 * `Icon.tsx` to'plamiga qo'shilmadi: u 24x24 va 1.75 chiziq qalinligi
 * bilan ishlaydi, bu esa 20x20 va ingichkaroq — matn ichida turadigan
 * kichik belgi.
 */
export function WarningIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 2.5 1.5 17h17L10 2.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M10 8v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="10" cy="14.3" r="0.9" fill="currentColor" />
    </svg>
  );
}
