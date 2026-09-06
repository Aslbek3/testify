// PM2 process konfiguratsiyasi — production uchun.
//
// FORK rejimida ishga tushiriladi, CLUSTER emas: src/lib/rateLimit.ts
// login urinishlar sonini jarayon xotirasida (in-memory Map) saqlaydi.
// Cluster rejimida (yoki bir nechta instans) har bir worker o'z alohida
// hisobini yuritadi va rate limit chetlab o'tiladi. Agar kelajakda
// bir nechta instans kerak bo'lsa, avval rateLimit.ts ni Redis kabi
// umumiy xotiraga ko'chirish shart.
//
// "npm start" ("next start") ishlatiladi — Next.js .env / .env.production
// fayllarini o'zi avtomatik yuklaydi, alohida dotenv sozlash shart emas.
module.exports = {
  apps: [
    {
      name: "testify",
      cwd: __dirname,
      script: "npm",
      // "next start" standart bo'yicha 0.0.0.0 ga bog'lanadi (HOSTNAME muhit
      // o'zgaruvchisini o'qimaydi) — shuning uchun -H bilan aniq 127.0.0.1 ga
      // cheklaymiz, faqat Nginx orqali (reverse proxy) kirish mumkin bo'lsin.
      args: "start -- -H 127.0.0.1",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        // 3000, 3210-3213 boshqa loyihalarda band (parfyum-web, rootweb) —
        // yangi web loyiha qo'shsangiz keyingi bo'sh portni tanlang.
        PORT: "3214",
      },
      error_file: "logs/error.log",
      out_file: "logs/out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
