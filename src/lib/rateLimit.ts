// Sodda, xotirada (in-memory) ishlovchi IP bo'yicha rate limiter.
// Faqat bitta process/instance uchun ishlaydi — Redis yoki boshqa tashqi
// bog'liqlik shart emas, chunki hozircha loyiha bitta serverda ishlaydi.

const WINDOW_MS = 15 * 60 * 1000; // 15 daqiqa
const MAX_ATTEMPTS = 10;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const attempts = new Map<string, RateLimitEntry>();

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/**
 * Berilgan kalit (odatda IP manzil) uchun urinishlar sonini tekshiradi va
 * oshiradi. `WINDOW_MS` oyna ichida `MAX_ATTEMPTS` martadan ko'p urinish
 * bo'lsa, `allowed: false` qaytaradi.
 *
 * Eskirgan yozuvlar alohida interval/cron orqali emas, balki shu funksiya
 * chaqirilganda "yo'l-yo'lakay" tozalanadi — bu miqyosda buning o'zi yetarli.
 */
export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();

  // Yo'l-yo'lakay tozalash: muddati o'tgan yozuvlarni olib tashlaymiz.
  for (const [entryKey, entry] of attempts) {
    if (entry.resetAt < now) {
      attempts.delete(entryKey);
    }
  }

  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true };
}
