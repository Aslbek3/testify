import { Icon, type IconName } from "@/components/Icon";
import { cn } from "@/lib/cn";

/**
 * Forma va amallardan keyingi xabar — xato, muvaffaqiyat yoki ogohlantirish.
 *
 * Nega alohida komponent: bir xil xato bloki 24 ta faylda AYNAN bir xil
 * sinflar bilan qo'lda yozilgan edi (`CLAUDE.md`: bir xil kod ikki joyda
 * qayta yozilmaydi). Uslubni o'zgartirish 24 ta faylga tegishni talab
 * qilardi.
 *
 * Ikkinchi va muhimroq sabab — KIRISH QULAYLIGI. Bu xabarlar so'rov
 * javobidan keyin PAYDO BO'LADI, ya'ni sahifa qayta yuklanmaydi va
 * ekranni o'qiydigan dastur hech narsa demaydi: ko'rmaydigan
 * foydalanuvchi "Saqlash" ni bosib, nima bo'lganini bilmay qolardi.
 * Ilova bo'ylab `aria-live` MUTLAQO yo'q edi.
 *
 * Shuning uchun:
 *   - xato va ogohlantirish `role="alert"` — darhol e'lon qilinadi,
 *     chunki foydalanuvchi harakatini to'xtatadi;
 *   - muvaffaqiyat `role="status"` — navbat bilan e'lon qilinadi,
 *     o'qilayotgan gapni bo'lmaydi.
 */
export type FormMessageTone = "danger" | "success" | "warning" | "info";

const TONE_STYLES: Record<FormMessageTone, string> = {
  danger: "border-danger/25 bg-danger-soft text-danger",
  success: "border-success/25 bg-success-soft text-text",
  warning: "border-warning/25 bg-warning-soft text-text",
  info: "border-info/25 bg-info-soft text-text",
};

const TONE_ICONS: Record<FormMessageTone, IconName> = {
  danger: "alertTriangle",
  success: "check",
  warning: "alertTriangle",
  info: "book",
};

const TONE_ICON_COLOR: Record<FormMessageTone, string> = {
  danger: "text-danger",
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
};

export function FormMessage({
  tone = "danger",
  children,
  className,
  /** Ikonka chizilmaydi — juda tor joyda (masalan jadval katagida). */
  withoutIcon = false,
}: {
  tone?: FormMessageTone;
  children: React.ReactNode;
  className?: string;
  withoutIcon?: boolean;
}) {
  return (
    <p
      role={tone === "success" || tone === "info" ? "status" : "alert"}
      className={cn(
        "flex items-start gap-2 rounded-md border px-3.5 py-2.5 text-[13px] leading-relaxed",
        TONE_STYLES[tone],
        className
      )}
    >
      {!withoutIcon && (
        <Icon
          name={TONE_ICONS[tone]}
          className={cn("mt-0.5 h-4 w-4 shrink-0", TONE_ICON_COLOR[tone])}
        />
      )}
      <span className="min-w-0 flex-1">{children}</span>
    </p>
  );
}
