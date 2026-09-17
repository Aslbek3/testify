import type { AttemptSource } from "@prisma/client";

/**
 * "Xatolarim" filtrining qoidalari — SOF funksiyalar, Prisma yo'q.
 *
 * Shu sabab ularni ham ekran (filtr tugmalari), ham server ("xatolardan
 * test" tuzayotganda) bir xil ishlatadi. Ikki joyda alohida yozilsa,
 * o'quvchi ekranda 7 ta savol ko'rib, test 9 ta savoldan tuzilib qolardi.
 */

/** Filtrda ko'rsatiladigan manbalar — tartibi ekranda ham shu. */
export const MISTAKE_SOURCES = [
  "PRACTICE",
  "MARATHON",
  "EXAM",
  "ASSIGNMENT",
  "MISTAKES",
] as const satisfies readonly AttemptSource[];

export type MistakeSource = (typeof MISTAKE_SOURCES)[number];

export const MISTAKE_SOURCE_LABEL: Record<MistakeSource, string> = {
  PRACTICE: "Mashq",
  MARATHON: "Maraton",
  EXAM: "Imtihon",
  ASSIGNMENT: "Vazifa",
  MISTAKES: "Xatolar ustida",
};

function isMistakeSource(value: string): value is MistakeSource {
  return (MISTAKE_SOURCES as readonly string[]).includes(value);
}

/**
 * URL'dagi `manba=EXAM,ASSIGNMENT` ni ro'yxatga aylantiradi. Noto'g'ri
 * qiymatlar jimgina tashlab yuboriladi — havolani qo'lda o'zgartirgan
 * o'quvchi xato ko'rmasin, shunchaki filtrsiz ro'yxat ochilsin.
 */
export function parseMistakeSources(value: string | undefined): MistakeSource[] {
  if (!value) return [];
  return [...new Set(value.split(",").map((s) => s.trim()).filter(isMistakeSource))];
}

/** Bo'sh ro'yxat — "hammasi" degani, filtr qo'llanmaydi. */
export function parseTopicIds(value: string | undefined): string[] {
  if (!value) return [];
  return [...new Set(value.split(",").map((s) => s.trim()).filter(Boolean))];
}

export type MistakeFilters = {
  sources: MistakeSource[];
  topicIds: string[];
};

type FilterableMistake = {
  topicId: string;
  /** Shu savolda xato qilingan urinishlarning manbalari. */
  sources: MistakeSource[];
};

/**
 * Tanlangan manbalar BIRLASHTIRILADI (yoki-yoki): "Imtihon + Vazifa" degani
 * ikkalasining birida xato qilingan savollar. Mavzu filtri esa ular ustiga
 * qo'shimcha shart bo'lib tushadi (va-va).
 */
export function filterMistakes<T extends FilterableMistake>(
  items: T[],
  filters: MistakeFilters
): T[] {
  return items.filter((item) => {
    if (filters.sources.length > 0 && !item.sources.some((s) => filters.sources.includes(s))) {
      return false;
    }
    if (filters.topicIds.length > 0 && !filters.topicIds.includes(item.topicId)) {
      return false;
    }
    return true;
  });
}
