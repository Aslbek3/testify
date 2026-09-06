import type { NextConfig } from "next";

// Kod serverning o'zida klon qilinib build qilinadi (boshqa joyga
// ko'chirilmaydi), shuning uchun "standalone" chiqarish rejimi kerak
// emas — PM2 oddiy "npm start" (next start) orqali ishga tushiradi.
const nextConfig: NextConfig = {};

export default nextConfig;
