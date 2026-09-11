import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { StudentAccess } from "@/lib/studentAccess";

/**
 * To'lov muddati o'tganda o'quvchining HAR sahifasida ko'rinadigan
 * ogohlantirish (`student/layout.tsx`).
 *
 * Faqat ikki holatda chiziladi: imtiyoz kunlari (hali ochiq, lekin
 * yopilish yaqin) va yopiq. Sinov yoki to'langan paytda hech narsa
 * ko'rsatilmaydi — doim turadigan banner bir necha kundan keyin
 * payqalmay qo'yadi va aynan kerakli paytda ta'sir qilmaydi.
 */
export function StudentAccessBanner({
  access,
  showLink,
}: {
  access: StudentAccess;
  /** To'lov sahifasining o'zida havola ortiqcha. */
  showLink: boolean;
}) {
  if (access.kind !== "grace" && access.kind !== "blocked") return null;

  return (
    <div className="mb-6 rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
      <p className="font-medium">
        {access.kind === "grace"
          ? `To'lov muddati ${formatDate(access.endedAt)} da tugagan. ${access.daysLeft} kundan keyin testlar yopiladi.`
          : "To'lov muddati tugagan — testlar yopiq."}
      </p>
      <p className="mt-1">
        To&apos;lovni amalga oshirib, chekni yuklang. Direktor tasdiqlashi
        bilan testlar yana ochiladi.
      </p>
      {showLink && (
        <Link href="/student/tolov" className="mt-2 inline-block font-medium underline">
          To&apos;lov sahifasiga o&apos;tish
        </Link>
      )}
    </div>
  );
}
