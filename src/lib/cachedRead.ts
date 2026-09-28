import { unstable_cache } from "next/cache";

/**
 * Og'ir, sekin o'zgaradigan o'qishlarni keshlash.
 *
 * Nega kerak: panel har ochilganda bir nechta agregat so'rov qaytadan
 * hisoblanadi. Ulardan ba'zilari butun `AttemptAnswer` jadvalini
 * guruhlaydi — bu jadval eng tez o'sadigani (har imtihonda o'quvchi
 * boshiga ~20 qator). Hozirgi hajmda sezilmaydi, lekin o'nlab
 * avtomaktabda direktor paneli har ochilganda shuni qayta hisoblashi
 * isrof.
 *
 * ⚠️ Bu kesh SO'ROVLAR ORASIDA yashaydi, ya'ni ma'lumot ESKIRADI.
 * Shuning uchun u FAQAT quyidagi shartlarga javob beradigan o'qishlarga
 * qo'yiladi:
 *
 *   1. Natija sekin o'zgaradi (kunlik statistika, platforma bo'yicha
 *      savol sifati) — bir necha daqiqa eskirgani hech kimga zarar
 *      qilmaydi.
 *   2. Natija foydalanuvchiga XOS EMAS. Kalitga tashkilot yoki mavzu
 *      kiradi, lekin hech qachon `userId` kirmaydi — aks holda bir
 *      odamning ma'lumoti boshqasiga ko'rinib qolishi mumkin edi.
 *   3. Foydalanuvchi o'z amalining natijasini DARHOL ko'rishi shart
 *      emas. To'lov tasdiqlash, o'quvchi qo'shish kabi joylarga bu
 *      kesh QO'YILMAYDI — u yerda odam "bosdim, nega o'zgarmadi?"
 *      deb qoladi.
 *
 * Request ichida takrorlanadigan o'qish uchun bu EMAS, React'ning
 * `cache()` i ishlatiladi (`getUserSessionState` dagi kabi): uning
 * qamrovi bitta so'rov va eskirish umuman bo'lmaydi.
 */

/** Statistik o'qishlar uchun standart muddat — 5 daqiqa. */
export const STATS_CACHE_SECONDS = 300;

/**
 * Funksiyani keshlangan ko'rinishga o'raydi.
 *
 * `keyParts` — kesh kalitining o'zgarmas qismi (odatda funksiya nomi).
 * Argumentlar avtomatik kalitga qo'shiladi, ya'ni har tashkilot o'z
 * yozuviga ega bo'ladi.
 */
export function cachedStatsRead<Fn extends (...args: never[]) => Promise<unknown>>(
  fn: Fn,
  keyParts: string[],
  revalidateSeconds: number = STATS_CACHE_SECONDS
): Fn {
  // Ikki marta `as`: `unstable_cache` o'z imzosida `any[]` kutadi va
  // qaytishda argument tiplarini yo'qotadi (standart qiymatli
  // parametrlar ham). Chaqiruvchi tomonda tip tekshiruvi saqlanib
  // qolishi uchun ASL imzo qaytariladi — o'ralgan funksiya aynan
  // o'shani bajaradi, faqat natijasi keshlanadi.
  const wrapped = unstable_cache(
    fn as unknown as (...args: unknown[]) => Promise<unknown>,
    keyParts,
    { revalidate: revalidateSeconds }
  );
  return wrapped as unknown as Fn;
}
