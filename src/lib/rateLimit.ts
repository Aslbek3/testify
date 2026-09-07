// Sodda, xotirada (in-memory) ishlovchi IP bo'yicha rate limiter.
// Faqat bitta process/instance uchun ishlaydi — Redis yoki boshqa tashqi
// bog'liqlik shart emas, chunki hozircha loyiha bitta serverda ishlaydi.

// Standart (login uchun sozlangan) cheklov — parol tanlashga qarshi qattiq.
const WINDOW_MS = 15 * 60 * 1000; // 15 daqiqa
const MAX_ATTEMPTS = 10;

export type RateLimitOptions = {
  windowMs?: number;
  maxAttempts?: number;
};

/**
 * Client xatolarini qayd etish (`POST /api/log/client`) uchun alohida byudjet.
 * Login cheklovi (15 daqiqada 10 marta) bu yerda juda qattiq: bitta sahifada
 * bir necha xato ketma-ket yuzaga kelishi normal holat. Ayni paytda logni
 * cheksiz to'ldirishga ham yo'l qo'yilmaydi — disk zaxira nusxalar bilan
 * bo'lishiladi.
 *
 * MUHIM: bu presetni ishlatgan kalit `clientLogRateLimitKey()` orqali
 * nomlar fazosiga ajratiladi, aks holda login va log hisoblagichlari bitta
 * yozuvni bo'lishib, login cheklovini bo'shashtirib yuborar edi.
 */
export const CLIENT_LOG_RATE_LIMIT: Required<RateLimitOptions> = {
  windowMs: 5 * 60 * 1000, // 5 daqiqa
  maxAttempts: 30,
};

export function clientLogRateLimitKey(ip: string): string {
  return `client-log:${ip}`;
}

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
 * oshiradi. Oyna ichida ruxsat etilgan urinishdan ko'p bo'lsa,
 * `allowed: false` qaytaradi.
 *
 * `options` berilmasa — login uchun sozlangan standart (15 daqiqada 10 marta)
 * ishlatiladi, ya'ni mavjud login cheklovi o'zgarishsiz qoladi. Boshqa
 * endpoint o'z byudjetini bersa, kalitini ham o'ziga xos prefiks bilan
 * ajratishi shart (masalan `clientLogRateLimitKey`).
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

export function checkRateLimit(
  key: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const windowMs = options.windowMs ?? WINDOW_MS;
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;
  const now = Date.now();

  // Yo'l-yo'lakay tozalash: muddati o'tgan yozuvlarni olib tashlaymiz.
  for (const [entryKey, entry] of attempts) {
    if (entry.resetAt < now) {
      attempts.delete(entryKey);
    }
  }

  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true };
}
