import { cn } from "@/lib/cn";
import type { SignShape } from "@/data/yolBelgilari";

/**
 * Belgining o'rnini bosuvchi shakl — haqiqiy rasm hali yo'q.
 *
 * Bo'sh kulrang to'rtburchak chizish mumkin edi, lekin YHQ'da belgining
 * SHAKLI va RANGI allaqachon ma'no bildiradi: qizil uchburchak
 * ogohlantiradi, qizil doira taqiqlaydi, ko'k doira buyuradi, ko'k
 * to'rtburchak xabar beradi. Shuning uchun o'rinbosar ham shu ikki
 * xossani saqlaydi — o'quvchi rasmsiz ham guruhni taniydi.
 *
 * Inline SVG ishlatiladi, `clip-path` emas: kesilgan shaklda ramka
 * ko'rinmay qolardi, SVG'da esa uchburchak ham, doira ham bir xil
 * qoida bilan (stroke) chiziladi. Rang `currentColor` orqali
 * `toneClass` dan keladi.
 *
 * Ichidagi matn — belgining YHQ raqami (masalan "3.24"): rasm
 * qo'shilgunicha eng aniq ko'rsatkich.
 */
export function SignShapeMark({
  shape,
  code,
  toneClass,
  className,
}: {
  shape: SignShape;
  code: string;
  /** Matn va chiziq rangini beruvchi sinf (`text-danger` kabi). */
  toneClass: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex h-14 w-14 shrink-0 items-center justify-center",
        toneClass,
        className
      )}
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        {shape === "triangle" && <path d="M24 5 L44 41 L4 41 Z" />}
        {shape === "diamond" && <path d="M24 4 L44 24 L24 44 L4 24 Z" />}
        {shape === "circle" && <circle cx="24" cy="24" r="19" />}
        {shape === "square" && <rect x="6" y="6" width="36" height="36" rx="3" />}
        {shape === "octagon" && (
          <path d="M17 5 H31 L43 17 V31 L31 43 H17 L5 31 V17 Z" />
        )}
      </svg>

      <span
        className={cn(
          "relative font-mono text-[10.5px] font-bold leading-none",
          // Uchburchakda matn pastroqda — shaklning kengroq qismida
          // tursin, aks holda uchiga chiqib ketadi.
          shape === "triangle" && "mt-3"
        )}
      >
        {code}
      </span>
    </span>
  );
}
