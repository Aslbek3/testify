import { redirect } from "next/navigation";

/**
 * Eski manzil — yangi umumiy sahifaga yo'naltiradi.
 *
 * O'quvchi sahifasi endi `/oquvchi/[id]` da va u barcha rollar uchun bitta
 * (`src/app/(obyekt)/`). Bu fayl saqlanadi, chunki eski havola brauzer
 * tarixida, xatcho'pda yoki kimgadir yuborilgan xabarda qolgan bo'lishi
 * mumkin — u 404 bermasligi kerak.
 *
 * `permanent: false` emas, `redirect()` ning standarti (307): manzil
 * kelajakda yana o'zgarishi mumkin va brauzer uni doimiy deb keshlab
 * qo'ymasligi kerak.
 */
export default async function LegacyRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/oquvchi/${id}`);
}
