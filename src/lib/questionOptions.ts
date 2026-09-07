/**
 * Savol variantlari bilan bog'liq umumiy qoidalar.
 *
 * Bu fayl ATAYLAB `services/`dan tashqarida turadi: undagi qiymatlar ham
 * serverda (validatsiya), ham brauzerda (owner formasi, o'quvchi testi)
 * kerak. `services/questions.ts` esa Prisma'ni import qiladi — uni klient
 * komponentidan chaqirib bo'lmaydi.
 */

/**
 * Bitta savoldagi variantlar sonining chegarasi.
 *
 * Nega 4 ta emas: haqiqiy YHQ savollarida variantlar soni turlicha —
 * bitta 20 savollik namunada 2 tadan 5 tagacha uchradi. Shuning uchun
 * qattiq 4 ta o'rniga oraliq tekshiriladi.
 */
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 5;

const OPTION_LETTERS = ["A", "B", "C", "D", "E"];

/**
 * Variant indeksini (0-based) ko'rinadigan harfga aylantiradi: 0 → "A".
 * Chegaradan chiqib ketsa (bo'lmasligi kerak) raqamga qaytadi.
 */
export function optionLetter(index: number): string {
  return OPTION_LETTERS[index] ?? String(index + 1);
}
