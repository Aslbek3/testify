"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Sahifani yangilaydi va yangilanish TUGAGUNCHA kutadi.
 *
 * `router.refresh()` o'zi bloklamaydi — u qayta chizishni boshlaydi va
 * darhol qaytadi. `useTransition` ichida chaqirilganda esa `isPending`
 * yangilanish tugagunicha `true` bo'lib turadi; shu orqali chaqiruvchi
 * "ekranda ko'rindi" nuqtasini biladi.
 */
export function useRefresh() {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const resolveRef = useRef<(() => void) | null>(null);

  // Bog'liqliklar ro'yxati ATAYLAB yo'q: tranzaksiya juda tez tugab,
  // `refreshing` umuman `true` bo'lmasligi mumkin. Har renderdan keyin
  // tekshirsak, bunday holatda ham kutish ochiladi va chaqiruvchi osilib
  // qolmaydi. Bu yerda `setState` chaqirilmaydi — faqat kutilayotgan
  // va'da yopiladi.
  useEffect(() => {
    if (!refreshing && resolveRef.current) {
      const resolve = resolveRef.current;
      resolveRef.current = null;
      resolve();
    }
  });

  function refresh(): Promise<void> {
    return new Promise<void>((resolve) => {
      resolveRef.current = resolve;
      startTransition(() => router.refresh());
    });
  }

  return { refresh, refreshing };
}

/**
 * O'zgartirish so'rovi + sahifani yangilash uchun umumiy hook.
 *
 * Nima muammoni hal qiladi: ilgari har bir joyda shunday yozilardi —
 *
 *     const res = await fetch(...);
 *     if (res.ok) router.refresh();
 *     setLoading(false);
 *
 * `router.refresh()` BLOKLAMAYDI: u server komponentini qayta chizishni
 * boshlaydi va darhol qaytadi. Ya'ni tugma o'sha zahoti yana yoqilardi,
 * jadval esa server javob bergunicha ESKI ma'lumot bilan turardi. Direktor
 * panelida server 2-4 soniya ishlaydi — foydalanuvchi uchun bu "bosdim,
 * hech narsa bo'lmadi, qotib qoldi" ko'rinishida edi. F5 bosgach o'zgarish
 * joyida bo'lardi, chunki server allaqachon yozib bo'lgan edi.
 *
 * Bu yerda `useTransition` ishlatiladi: `router.refresh()` tranzaksiya
 * ichida chaqirilgani uchun `isPending` yangilanish TUGAGUNCHA `true`
 * bo'lib turadi. `run()` esa shu paytgacha kutadi — ya'ni chaqiruvchi
 * "saqlandi va ekranda ko'rindi" nuqtasini aniq biladi.
 */
export function useServerMutation() {
  const { refresh, refreshing } = useRefresh();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * So'rovni yuboradi va muvaffaqiyatli bo'lsa sahifa yangilanishini
   * KUTADI.
   *
   * @returns `true` — hammasi tugadi va ekran yangilandi.
   */
  async function run(request: () => Promise<Response>): Promise<boolean> {
    setSending(true);
    setError(null);
    try {
      const res = await request();
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Xatolik yuz berdi");
        return false;
      }
    } catch {
      setError("Tarmoq xatosi — qayta urinib ko'ring");
      return false;
    } finally {
      setSending(false);
    }

    await refresh();
    return true;
  }

  return {
    run,
    /** So'rov yuborilyapti YOKI sahifa yangilanyapti. */
    pending: sending || refreshing,
    error,
    setError,
  };
}
