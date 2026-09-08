import type { NextConfig } from "next";

// Kod serverning o'zida klon qilinib build qilinadi (boshqa joyga
// ko'chirilmaydi), shuning uchun "standalone" chiqarish rejimi kerak
// emas — PM2 oddiy "npm start" (next start) orqali ishga tushiradi.
const nextConfig: NextConfig = {
  // `X-Powered-By: Next.js` sarlavhasini o'chiradi. Bu sarlavha hech qanday
  // foyda bermaydi, lekin har bir javobda ishlatilayotgan freymvorkni aytib
  // turadi — ma'lum bir versiyaga qarshi zaiflik chiqqanda hujumchi nishonni
  // qidirib o'tirmasdan topadi. Himoyaning o'zi emas, lekin bepul.
  poweredByHeader: false,
};

export default nextConfig;
