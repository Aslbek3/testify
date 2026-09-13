"use client";

import { useEffect, useRef } from "react";
import { useRefresh } from "@/lib/useServerMutation";

/**
 * Sahifa KO'RILGANDA o'qilmaganlarni o'qilgan qiladi va menyudagi sonni
 * yangilaydi. Ro'yxat esa shu ko'rishda "yangi" belgisini saqlab turadi —
 * u serverda o'qilmagan holatda chizilgan.
 *
 * Nega server komponentida (sahifa chizilayotganda) emas: GET so'rovi
 * holatni o'zgartirmasligi kerak. Next.js havolalarni oldindan yuklaydi
 * (prefetch) — shunda foydalanuvchi sahifani ochmasdan turib ham hammasi
 * "o'qilgan" bo'lib qolishi mumkin edi.
 */
export function MarkNotificationsRead() {
  const { refresh } = useRefresh();
  const sent = useRef(false);

  useEffect(() => {
    // React dev rejimida effekt ikki marta ishlaydi — so'rov bir marta ketsin.
    if (sent.current) return;
    sent.current = true;
    fetch("/api/notifications", { method: "PATCH" })
      .then((res) => (res.ok ? refresh() : undefined))
      .catch(() => {
        // Tarmoq xatosi — keyingi ochilishda qayta uriniladi, xabar shart emas.
      });
  }, [refresh]);

  return null;
}
