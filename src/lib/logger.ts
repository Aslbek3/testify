type LogContext = {
  path?: string;
  userId?: string | null;
  [key: string]: unknown;
};

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "secret",
  "jwt",
  "authorization",
  "cookie",
  "accesstoken",
  "refreshtoken",
  "apikey",
]);

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? "[REDACTED]" : redact(val);
    }
    return out;
  }
  return value;
}

function buildEntry(error: unknown, context: LogContext) {
  const { path, userId, ...extra } = context;
  return {
    level: "error",
    time: new Date().toISOString(),
    path: path ?? null,
    userId: userId ?? null,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...(Object.keys(extra).length ? { context: redact(extra) } : {}),
  };
}

/**
 * Xatoni vaqt, yo'l va foydalanuvchi id bilan structured JSON qatori
 * sifatida qayd etadi. Maxfiy maydonlar (parol, token va h.k.) avtomatik
 * "[REDACTED]" bilan almashtiriladi — hech qachon logga tushmaydi.
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
