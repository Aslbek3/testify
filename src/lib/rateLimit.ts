// Sodda, xotirada (in-memory) ishlovchi IP bo'yicha rate limiter.
// Faqat bitta process/instance uchun ishlaydi — Redis yoki boshqa tashqi
// bog'liqlik shart emas, chunki hozircha loyiha bitta serverda ishlaydi.

// Preset berilmaganda ishlatiladigan konservativ standart. Hozircha har bir
// chaqiruvchi o'z presetini beradi (pastdagi eksportlarga qara) — bu faqat
// zaxira qiymat, yangi endpoint tasodifan cheklovsiz qolib ketmasligi uchun.
const WINDOW_MS = 15 * 60 * 1000; // 15 daqiqa
const MAX_ATTEMPTS = 10;

export type RateLimitOptions = {
  windowMs?: number;
  maxAttempts?: number;
};

/**
 * Login uchun IP bo'yicha cheklov — "bir NAT ortidagi butun sinf" muammosini
 * hisobga olib bo'shroq qilingan.
 *
 * Nima uchun 40: bitta avtomaktabning ~30 o'quvchisi bitta tashqi IP ortida
 * bo'lishi odatiy hol (dars boshida hammasi ketma-ket kiradi). Muvaffaqiyatli
 * login IP hisoblagichini butunlay tozalagani uchun (`resetRateLimit`, login
 * route'iga qara) normal darsda bu chegaraga umuman yetib borilmaydi —
 * hisoblagichda faqat MUVAFFAQIYATSIZ urinishlar to'planib qoladi. 40 —
 * shu 30 kishilik sinfning har biri bir-ikki marta xato yozishi uchun zaxira.
 *
 * Bu cheklov endi brute-force'ning asosiy to'sig'i EMAS (hujumchi ko'p IP
 * ishlatishi mumkin) — asosiy to'siq `LOGIN_ACCOUNT_RATE_LIMIT`.
 */
export const LOGIN_IP_RATE_LIMIT: Required<RateLimitOptions> = {
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  maxAttempts: 40,
};

/**
 * Login uchun hisob (normallashtirilgan email) bo'yicha cheklov — brute
 * force'ga qarshi ASOSIY himoya. IP bo'yicha cheklovni hujumchi yuzlab proxy
 * bilan aylanib o'tishi mumkin, lekin nishon hisob bitta bo'lgani uchun bu
 * hisoblagich baribir to'ladi.
 *
 * Nima uchun 10: bu ilgari IP uchun ishlatilgan chegara, ya'ni parol
 * tanlashga qarshi qattiqlik darajasi pasaymadi, faqat to'g'ri o'lchamga
 * (bitta hisob) ko'chdi. Muvaffaqiyatli login bu hisoblagichni ham
 * tozalaydi, shuning uchun parolini eslay olmay 3-4 marta xato yozgan
 * halol foydalanuvchi zarar ko'rmaydi.
 *
 * Kelishuv: nishon email'ni biladigan kimsa ataylab xato parol yuborib, o'sha
 * hisobni 15 daqiqaga bloklab qo'yishi mumkin. Bu har qanday hisob bo'yicha
 * cheklovning tabiiy narxi; oyna qisqa (15 daqiqa) va IP cheklovi bunday
 * "shovqin"ni ham cheklab turadi.
 */
export const LOGIN_ACCOUNT_RATE_LIMIT: Required<RateLimitOptions> = {
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  maxAttempts: 10,
};

/**
 * Parol tiklash (ustoz -> o'quvchi, direktor -> ustoz) uchun alohida byudjet,
 * kalit — parolni tiklayotgan xodimning id'si.
 *
 * Nima uchun kerak: buzib olingan bitta ustoz hisobi bilan 200 o'quvchining
 * parolini soniyalarda almashtirib yuborish mumkin edi — hammasi
 * `sessionVersion` oshgani uchun tizimdan chiqib ketardi va qayta kira
 * olmasdi.
 *
 * Nima uchun 15/soat: haqiqiy ustoz kuniga bir-ikki, ko'pi bilan bir necha
 * o'quvchining parolini tiklaydi (yangi guruh qabul qilinganda ham bir
 * seansda 15 tasi yetarli). Ya'ni normal foydalanuvchi buni sezmaydi, lekin
 * ommaviy "hammani chiqarib yuborish" hujumi birinchi 15 tadan keyin
 * to'xtaydi va tergov uchun vaqt qoladi.
 */
export const PASSWORD_RESET_RATE_LIMIT: Required<RateLimitOptions> = {
  windowMs: 60 * 60 * 1000, // 1 soat
  maxAttempts: 15,
};

/**
 * Client xatolarini qayd etish (`POST /api/log/client`) uchun alohida byudjet.
 * Login cheklovi bu yerda juda qattiq: bitta sahifada bir necha xato ketma-ket
 * yuzaga kelishi normal holat. Ayni paytda logni cheksiz to'ldirishga ham
 * yo'l qo'yilmaydi — disk zaxira nusxalar bilan bo'lishiladi.
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

/** Login urinishlari — IP bo'yicha hisoblagich. */
export function loginIpRateLimitKey(ip: string): string {
  return `login-ip:${ip}`;
}

/**
 * Login urinishlari — hisob bo'yicha hisoblagich. Email HAR DOIM
 * `normalizeEmail()` dan o'tkazib berilishi shart, aks holda `Ali@x.com` va
 * `ali@x.com` ikki xil hisoblagich olib, cheklovni ikkilantirar edi.
 */
export function loginAccountRateLimitKey(normalizedEmail: string): string {
  return `login-account:${normalizedEmail}`;
}

/** Parol tiklash — tiklayotgan xodim (ustoz/direktor) bo'yicha hisoblagich. */
export function passwordResetRateLimitKey(actorUserId: string): string {
  return `password-reset:${actorUserId}`;
}

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const attempts = new Map<string, RateLimitEntry>();

/**
 * Map'ning yuqori chegarasi. Kalitning bir qismi (IP, email) tashqaridan
 * keladi, ya'ni chegarasiz Map xotirani to'ldirish hujumiga ochiq bo'lardi.
 * 50 000 yozuv ~ bir necha MB — bitta VPS uchun xavfsiz, real trafik esa
 * bunga hech qachon yaqinlashmaydi.
 */
const MAX_TRACKED_KEYS = 50_000;

/**
 * Muddati o'tgan yozuvlarni tozalash oralig'i. Ilgari tozalash HAR bir
 * chaqiruvda butun Map'ni aylanib chiqar edi — O(n) — va katta Map'da bu
 * protsessorni bekorga yeb qo'yardi. Endi amortizatsiya qilingan: bir
 * daqiqada ko'pi bilan bir marta to'liq aylanish bo'ladi, oraliqda esa har
 * bir yozuv baribir o'zining `resetAt`i bo'yicha o'qish paytida eskirgan deb
 * hisoblanadi (ya'ni kechikkan tozalash to'g'rilikka ta'sir qilmaydi).
 */
const CLEANUP_INTERVAL_MS = 60 * 1000;
let lastCleanupAt = 0;

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/** IPv6'ning eng uzun matn shakli 45 belgi (IPv4-mapped bilan birga). */
const MAX_IP_LENGTH = 45;

/**
 * Qiymat haqiqatan IP manzilga o'xshaydimi. To'liq RFC tekshiruvi emas —
 * maqsad rate limit kalitiga ixtiyoriy matn tushib qolishining oldini olish
 * (kalit maydoni tashqaridan boshqarilsa, hujumchi har so'rovga yangi kalit
 * berib cheklovni butunlay aylanib o'tadi).
 *
 * IPv4'da boshida nol bo'lgan shakl (`01.2.3.4`) rad etiladi: bu bir xil
 * manzilning ikkinchi yozilishi bo'lib, ikkita alohida hisoblagich hosil
 * qilar edi. Nginx `$remote_addr`ni har doim kanonik shaklda yozadi.
 */
function isValidIp(value: string): boolean {
  if (!value || value.length > MAX_IP_LENGTH) return false;

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(value);
  if (ipv4) {
    return ipv4
      .slice(1)
      .every((octet) => Number(octet) <= 255 && (octet.length === 1 || octet[0] !== "0"));
  }

  // IPv6: hex raqamlar va ikki nuqta, ixtiyoriy IPv4-mapped quyruq
  // (`::ffff:203.0.113.7`). Kamida bitta ":" bo'lishi shart.
  return /^[0-9a-f:]*:[0-9a-f:]*(?:\d{1,3}(?:\.\d{1,3}){3})?$/i.test(value);
}

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
 *
 * ⚠️ `x-real-ip` ga SHARTSIZ ishonib bo'lmaydi. Bu himoya birinchi navbatda
 * Nginx'ning `proxy_set_header X-Real-IP $remote_addr;` bilan sarlavhani
 * MAJBURAN qayta yozishiga tayanadi (`docs/nginx.conf.example`ga qara).
 * Lekin ilova Nginx'ni chetlab o'tib ham topilishi mumkin (CLAUDE.md'da
 * aynan shunday hodisa yozilgan: `next start` `0.0.0.0`ga bog'lanib qolgan
 * edi) — o'sha holatda hujumchi har so'rovga `X-Real-IP: 1.2.3.<n>` qo'yib
 * login cheklovini butunlay aylanib o'tar edi. Shuning uchun endi kod
 * darajasida ham zaxira bor:
 *   1. qiymat haqiqiy IP shaklida bo'lmasa — qabul qilinmaydi;
 *   2. login cheklovi endi faqat IP'ga tayanmaydi — hisob (email) bo'yicha
 *      ikkinchi hisoblagich bor (`LOGIN_ACCOUNT_RATE_LIMIT`), va uni IP
 *      almashtirish bilan aylanib o'tib bo'lmaydi.
 */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp && isValidIp(realIp)) return realIp;

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const hops = forwardedFor.split(",").map((hop) => hop.trim());
    const lastHop = hops[hops.length - 1];
    if (lastHop && isValidIp(lastHop)) return lastHop;
  }

  return "unknown";
}

/** Muddati o'tgan barcha yozuvlarni olib tashlaydi (O(n), kamdan-kam chaqiriladi). */
function pruneExpired(now: number): void {
  for (const [entryKey, entry] of attempts) {
    if (entry.resetAt <= now) {
      attempts.delete(entryKey);
    }
  }
}

/**
 * Map hajmini chegarada ushlab turadi: avval muddati o'tganlarni tozalaydi,
 * agar shundan keyin ham joy bo'lmasa — eng eskilarini (Map o'z tabiati
 * bo'yicha qo'shilish tartibini saqlaydi, ya'ni birinchi kalitlar eng eski
 * yozuvlar) olib tashlaydi.
 *
 * Kelishuv: 50 000 dan ortiq soxta kalit yasagan hujumchi shu yo'l bilan
 * boshqalarning hisoblagichini siqib chiqarishi mumkin. Buning uchun unga
 * 50 000 ta so'rov kerak, va hisob bo'yicha cheklov (o'sha oynada qayta
 * yaratiladi) baribir nishon hisobni himoya qilib turadi.
 */
function enforceCapacity(now: number): void {
  if (attempts.size < MAX_TRACKED_KEYS) return;

  pruneExpired(now);
  if (attempts.size < MAX_TRACKED_KEYS) return;

  const excess = attempts.size - MAX_TRACKED_KEYS + 1;
  let removed = 0;
  for (const entryKey of attempts.keys()) {
    attempts.delete(entryKey);
    removed += 1;
    if (removed >= excess) break;
  }
}

/**
 * Berilgan kalit uchun urinishlar sonini tekshiradi va oshiradi. Oyna ichida
 * ruxsat etilgan urinishdan ko'p bo'lsa, `allowed: false` qaytaradi.
 *
 * Har bir endpoint o'z byudjetini (preset) va o'z kalit prefiksini berishi
 * shart (masalan `loginIpRateLimitKey`, `clientLogRateLimitKey`) — aks holda
 * turli endpointlar bitta yozuvni bo'lishib, eng qattiq cheklovni
 * bo'shashtirib yuborar edi.
 *
 * Eskirgan yozuvlar alohida interval/cron orqali emas, balki shu funksiya
 * chaqirilganda "yo'l-yo'lakay" tozalanadi — lekin har chaqiruvda emas,
 * `CLEANUP_INTERVAL_MS`da bir marta (izohga qara).
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const windowMs = options.windowMs ?? WINDOW_MS;
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;
  const now = Date.now();

  if (now - lastCleanupAt >= CLEANUP_INTERVAL_MS) {
    lastCleanupAt = now;
    pruneExpired(now);
  }

  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    enforceCapacity(now);
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

/**
 * Kalitning hisoblagichini butunlay o'chiradi.
 *
 * Login muvaffaqiyatli bo'lganda ISHLATILISHI SHART: aks holda bitta NAT
 * ortidagi sinf a'zolari bir-birini bloklab qo'yar edi — 30 o'quvchi dars
 * boshida ketma-ket (muvaffaqiyatli!) kirsa ham umumiy IP hisoblagichi
 * to'lib qolardi. Tozalashdan keyin hisoblagichda faqat muvaffaqiyatsiz
 * urinishlar qoladi, ya'ni cheklov aynan o'zi mo'ljallangan hodisani
 * o'lchaydi.
 */
export function resetRateLimit(key: string): void {
  attempts.delete(key);
}
