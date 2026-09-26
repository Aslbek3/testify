/**
 * Telefon raqami — O'zbekiston formati.
 *
 * Nega kerak: `User.phone` maydoni boshidan bor edi (`CLAUDE.md` — kelajakda
 * telefon+SMS orqali kirish uchun), lekin uni to'ldiradigan hech qanday joy
 * yo'q edi. Natijada qabulxona jadvalidagi "telefon" ustuni doim email
 * ko'rsatardi, holbuki qabulxona o'quvchi bilan aynan telefon orqali
 * gaplashadi.
 *
 * Saqlash shakli BITTA: `+998XXXXXXXXX`. Kiritishda esa odam qanday
 * yozsa shunday qabul qilinadi (bo'shliq, tire, qavs, `998...`, `90...`) —
 * raqamni "to'g'ri" ko'chirib yozish foydalanuvchining ishi emas.
 */

/** Saqlanadigan shakl: `+998` va 9 ta raqam. */
const UZ_PREFIX = "+998";
const LOCAL_DIGITS = 9;

/** Kiritish maydonidagi tavsiya — xato xabarida ham shu ishlatiladi. */
export const PHONE_HINT = "Masalan: +998 90 123 45 67";

export const INVALID_PHONE_MESSAGE = `Telefon raqami noto'g'ri. ${PHONE_HINT}`;

/**
 * Kiritilgan raqamni saqlash shakliga keltiradi.
 *
 * Bo'sh satr `null` qaytaradi — telefon MAJBURIY emas: avtomaktab uni
 * bilmasligi mumkin, va shu sabab o'quvchi qo'shishni to'xtatib
 * qo'yish noto'g'ri bo'lardi.
 *
 * @returns `+998XXXXXXXXX`, bo'sh kiritilsa `null`, noto'g'ri bo'lsa `false`.
 */
export function normalizePhone(raw: string): string | null | false {
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  const digits = trimmed.replace(/\D/g, "");

  // "998901234567" yoki "+998901234567"
  if (digits.length === 3 + LOCAL_DIGITS && digits.startsWith("998")) {
    return UZ_PREFIX + digits.slice(3);
  }
  // "901234567" — mamlakat kodisiz
  if (digits.length === LOCAL_DIGITS) {
    return UZ_PREFIX + digits;
  }
  // "0901234567" — ba'zilar shaharlararo nolni qo'shib yozadi
  if (digits.length === LOCAL_DIGITS + 1 && digits.startsWith("0")) {
    return UZ_PREFIX + digits.slice(1);
  }

  return false;
}

/**
 * Ko'rsatish uchun: `+998901234567` → `+998 90 123 45 67`.
 *
 * Kutilmagan shakldagi qiymat (masalan qo'lda bazaga yozilgani) o'zgarishsiz
 * qaytariladi — ko'rsatish funksiyasi ma'lumotni yashirmasligi kerak.
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 3 + LOCAL_DIGITS || !digits.startsWith("998")) {
    return phone;
  }
  const d = digits.slice(3);
  return `${UZ_PREFIX} ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7)}`;
}
