import type { IconName } from "@/components/Icon";

/**
 * "Bugungi ish" — har bir rol ilovani ochganda birinchi ko'radigan blok.
 *
 * Nega kerak: panel KO'RSATKICHLARNI ko'rsatadi (foiz, son, shkala), lekin
 * ular o'lchov — harakat emas. Foydalanuvchining birinchi savoli esa
 * "bugun nima qilishim kerak?". Panelda bunga javob bo'lmasa, odam har
 * safar o'zi qidiradi va odatda eng oson ishni tanlaydi.
 *
 * Bu fayl SOF: Prisma ham, React ham yo'q — faqat tur va tartib qoidasi.
 * Ma'lumot yig'ish `services/tasks.ts` da, ko'rsatish `TaskCard` da.
 *
 * Yozish qoidalari (barcha rollarda bir xil):
 *
 * 1. `title` — MUAMMONING O'ZI, son bilan. Bo'lim nomi emas.
 *    ✗ "To'lovlarni tekshirish"   ✓ "3 ta chek tasdiq kutmoqda"
 * 2. `detail` — qaror qabul qilishga yordam beradigan aniq ma'lumot.
 *    "1 350 000 so'm · eng eskisi 4 kun kutmoqda" — buni o'qib, hozir
 *    ochish kerakmi yoki ertaga ham bo'ladimi, hal qilinadi.
 * 3. `action` — FE'L. ✗ "Ko'rish" / "Batafsil"   ✓ "Tasdiqlash"
 * 4. `severity` — ma'no, bezak emas. Uch daraja, pastga qara.
 */

/**
 * - `urgent` — pul yoki kirish bloklangan; kechiktirilsa zarar bo'ladi.
 * - `attention` — e'tibor kerak, lekin hali muammo emas.
 * - `info` — bilib qo'yish uchun; hech narsa buzilmaydi.
 */
export type TaskSeverity = "urgent" | "attention" | "info";

export type RoleTask = {
  /** Barqaror kalit — React ro'yxati uchun. */
  id: string;
  severity: TaskSeverity;
  icon: IconName;
  title: string;
  detail?: string;
  action: string;
  href: string;
};

const SEVERITY_ORDER: Record<TaskSeverity, number> = {
  urgent: 0,
  attention: 1,
  info: 2,
};

/**
 * Shoshilinchlik bo'yicha tartiblaydi. Teng darajadagilar qo'shilgan
 * tartibida qoladi (barqaror saralash) — yig'uvchi funksiyada tartib
 * ataylab tanlangan bo'ladi, masalan pul birinchi.
 */
export function sortTasks(tasks: RoleTask[]): RoleTask[] {
  return [...tasks].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );
}

/** Sarlavhadagi son uchun — faqat haqiqatan shoshilinchlari sanaladi. */
export function countUrgent(tasks: RoleTask[]): number {
  return tasks.filter((task) => task.severity === "urgent").length;
}
