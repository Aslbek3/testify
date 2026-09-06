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
/**
 * So'rovchining IP manzilini "ishonchli hop" sifatida oladi.
 *
 * `x-forwarded-for`ning BIRINCHI qiymatini olish xato — bu sarlavhani
 * mijozning o'zi (hujumchi) to'liq yasab yubora oladi, va har safar
 * boshqa qiymat qo'yib rate limit'ni butunlay aylanib o'tishi mumkin.
 * Loyiha reverse-proxy (Nginx) orqasida ishlashini hisobga olib, faqat
 * proxy o'zi qo'shgan OXIRGI qiymat ishonchli — proxy mijozdan kelgan
 * `x-forwarded-for`ni har doim o'zining ko'rgan IP manzili bilan
 * to'ldiradi (oldingi (agar bo'lsa, hujumchi yasagan) qiymatlarni
 * o'chirmasdan oxiriga qo'shib), shuning uchun ro'yxatning oxirgi
 * elementi — bevosita proxy bilan gaplashgan haqiqiy client bo'ladi.
 * `x-real-ip` (Nginx'da odatda alohida sozlanadi) mavjud bo'lsa, u ham
 * ishonchli hisoblanadi va ustunlik beriladi.
 */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const hops = forwardedFor.split(",").map((h) => h.trim());
    return hops[hops.length - 1] || "unknown";
  }

  return "unknown";
}

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
