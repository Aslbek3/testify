type LogContext = {
  path?: string;
  userId?: string | null;
  [key: string]: unknown;
};

/**
 * Maxfiy maydon nomlarining bo'laklari. Solishtirish ANIQ MOSLIK emas,
 * "kalit ichida shu so'z bormi" ko'rinishida ketadi — aks holda
 * `passwordHash`, `password_hash`, `newPassword`, `accessToken` kabi real
 * maydonlar filtrdan bemalol o'tib ketardi (aynan shu bo'shliq bor edi).
 */
const SENSITIVE_KEY_PARTS = [
  "password",
  "token",
  "secret",
  "jwt",
  "authorization",
  "cookie",
  "apikey",
  "api_key",
  "credential",
];

/**
 * `redact()` uchun chuqurlik chegarasi. O'ziga havola qiluvchi obyekt
 * (masalan Prisma yoki request kontekstidagi tsikl) cheksiz rekursiya berib
 * process'ni yiqitar edi. `seen` to'plami to'g'ridan-to'g'ri tsiklni,
 * chuqurlik chegarasi esa juda chuqur (lekin tsiklsiz) daraxtni to'xtatadi.
 */
const MAX_REDACT_DEPTH = 8;

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part));
}

function redact(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_REDACT_DEPTH) return "[MAX_DEPTH]";
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);

  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1, seen));

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = isSensitiveKey(key) ? "[REDACTED]" : redact(val, depth + 1, seen);
  }
  return out;
}

/**
 * Matn ichidagi `passwordHash: "$2b$10$..."` ko'rinishidagi juftliklar.
 * Prisma xatosi muvaffaqiyatsiz so'rovning `data` obyektini XABAR MATNI
 * ichida ko'rsatadi — o'sha yerda yangi yaratilgan foydalanuvchining bcrypt
 * hash'i turadi va u to'g'ridan-to'g'ri PM2 logiga, keyin zaxira nusxalarga
 * tushib ketardi (`redact()` faqat `context` obyektiga qo'llanar edi).
 *
 * Kalit atrofidagi `[A-Za-z0-9_]{0,32}` ataylab chegaralangan — cheklovsiz
 * `\w*` uzun matnda regex'ni sekinlashtirishi mumkin edi.
 */
const SENSITIVE_TEXT_PATTERN = new RegExp(
  `(["'\`]?[A-Za-z0-9_]{0,32}(?:${SENSITIVE_KEY_PARTS.join("|")})[A-Za-z0-9_]{0,32}["'\`]?\\s*[:=]\\s*)` +
    `(?:"[^"\\n]*"|'[^'\\n]*'|\`[^\`\\n]*\`|[^\\s,;\\n)}\\]]+)`,
  "gi"
);

/** Kalitsiz, "yalang'och" holda uchragan bcrypt hash va JWT'lar. */
const BCRYPT_HASH_PATTERN = /\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}/g;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g;

/** `message` va `stack` uchun matn darajasidagi tozalash. */
function redactText(text: string): string;
function redactText(text: string | undefined): string | undefined;
function redactText(text: string | undefined): string | undefined {
  if (!text) return text;
  return text
    .replace(SENSITIVE_TEXT_PATTERN, (_match, prefix: string) => `${prefix}[REDACTED]`)
    .replace(BCRYPT_HASH_PATTERN, "[REDACTED]")
    .replace(JWT_PATTERN, "[REDACTED]");
}

function buildEntry(error: unknown, context: LogContext) {
  const { path, userId, ...extra } = context;
  return {
    level: "error",
    time: new Date().toISOString(),
    path: path ?? null,
    userId: userId ?? null,
    message: redactText(error instanceof Error ? error.message : String(error)),
    stack: redactText(error instanceof Error ? error.stack : undefined),
    ...(Object.keys(extra).length ? { context: redact(extra) } : {}),
  };
}

/**
 * Xatoni vaqt, yo'l va foydalanuvchi id bilan structured JSON qatori
 * sifatida qayd etadi. Maxfiy maydonlar (parol, hash, token va h.k.) avtomatik
 * "[REDACTED]" bilan almashtiriladi — hech qachon logga tushmaydi. Tozalash
 * `context` obyektiga ham, `message`/`stack` MATNIGA ham qo'llanadi (Prisma
 * xatolari maxfiy qiymatni xabar matni ichida ko'rsatadi).
 *
 * Serverda (API route, error.tsx ning server tomoni) to'g'ridan-to'g'ri
 * console.error ga yoziladi — buni PM2 log fayliga yig'adi. Brauzerda
 * (client komponentlar, masalan error.tsx) esa /api/log/client orqali
 * serverga yuboriladi — aks holda xato faqat brauzer konsolida qolib,
 * izsiz yo'qoladi.
 */
export function logError(error: unknown, context: LogContext = {}): void {
  const entry = buildEntry(error, context);

  if (typeof window === "undefined") {
    console.error(JSON.stringify(entry));
    return;
  }

  // Serverdagi endpoint sessiya talab qiladi va rate limit'ga ega, shuning
  // uchun u xatoni qabul qilmasligi ham mumkin (chiqib ketgan foydalanuvchi —
  // 401, juda ko'p xato — 429). Bunday holatda hech narsa "portlamaydi":
  // xato jimgina brauzer konsoliga yoziladi.
  fetch("/api/log/client", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
    keepalive: true,
  })
    .then((response) => {
      if (!response.ok) {
        console.error(JSON.stringify(entry));
      }
    })
    .catch(() => {
      console.error(JSON.stringify(entry));
    });
}
