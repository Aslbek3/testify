/**
 * Intl.DateTimeFormat bilan emas, qo'lda quriladi — "uz-UZ" lokali server
 * (Node) va brauzer ICU ma'lumotlari orasida kun/oy/yil tartibini boshqacha
 * berishi mumkin edi, bu esa server va klient render natijasi mos
 * kelmasligiga (hydration mismatch) olib kelardi.
 */
export function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
