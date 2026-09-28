"use client";

import { useEffect } from "react";

/**
 * ILDIZ layout yiqilganda ko'rsatiladigan ekran.
 *
 * Oddiy `error.tsx` dan farqi: u layout ICHIDA chiziladi, ya'ni layout
 * ishlamay qolgan holatni tuta olmaydi. Bu fayl esa butun hujjatni
 * (`<html>` va `<body>`) o'zi chizadi — shuning uchun sahifadagi
 * uslublar, shriftlar va komponentlar mavjud emas deb hisoblanadi.
 *
 * Shu sababli bu yerda Tailwind sinflari ATAYLAB ishlatilmaydi va
 * uslub inline yoziladi: agar xato aynan CSS yuklanmaganidan bo'lsa,
 * sinflarga tayangan ekran ham bo'sh ko'rinardi.
 *
 * Bu ekran deyarli hech qachon ko'rinmasligi kerak. Ko'rinsa — PM2
 * logida sabab bor.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // `logError` ishlatilmaydi: u ilova modullariga bog'liq va aynan
    // shu holatda ular yuklanmagan bo'lishi mumkin.
    console.error("global-error", error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="uz">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f7fb",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#112337",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "420px", textAlign: "center" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>
            Kutilmagan xatolik
          </h1>
          <p style={{ marginTop: "10px", fontSize: "14px", lineHeight: 1.6, color: "#718297" }}>
            Ilovani yuklab bo&apos;lmadi. Qayta urinib ko&apos;ring — muammo
            takrorlansa, birozdan keyin qaytib kiring.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              borderRadius: "11px",
              border: "none",
              background: "#0ea79a",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Qayta urinish
          </button>
        </div>
      </body>
    </html>
  );
}
