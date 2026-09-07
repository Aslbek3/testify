/**
 * Email bilan ishlashning yagona joyi. Postgres'da satr tengligi katta-kichik
 * harfga sezgir — shuning uchun `Ali@x.com` va `ali@x.com` ikki xil hisob
 * bo'lib qolar edi, `Ali@x.com` deb yaratilgan o'quvchi esa `ali@x.com` deb
 * kirmoqchi bo'lganda doimiy 401 olar edi. Har bir yozuvda (create) va
 * login'dagi qidiruvda shu funksiya orqali normallashtiriladi.
 *
 * Diqqat: bu fayl Prisma'ni import qilmaydi — u faqat toza satr mantiqi.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Minimal shakl tekshiruvi: `@` bo'lishi, uning ikkala tomonida ham
 * biror belgi bo'lishi va ichida bo'sh joy bo'lmasligi shart. To'liq
 * RFC tekshiruvi emas — maqsad `"@"` kabi ma'nosiz qiymatlarni hisob
 * yaratishda o'tkazmaslik.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+$/.test(email);
}

/** Email shakli noto'g'ri bo'lganda route'lar qaytaradigan xabar. */
export const INVALID_EMAIL_MESSAGE = "Email manzili noto'g'ri";
