"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";

type Theme = "light" | "dark";
const STORAGE_KEY = "testify-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    let stored: Theme | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    } catch {
      // localStorage bloklangan bo'lishi mumkin — tizim afzalligiga tushamiz
    }
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    // Mavzu `localStorage` va `prefers-color-scheme` dan o'qiladi; ikkalasi
    // ham serverda mavjud emas. Render paytida o'qilsa SSR va klient boshqa
    // natija berib, hidratsiya buziladi. Bu qoida istisno qiladigan
    // "tashqi manba bilan sinxronlash" holati.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(stored === "light" || stored === "dark" ? stored : systemPrefersDark ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // saqlab bo'lmasa ham UI shu sessiyada ishlayveradi
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Yorug' rejimga o'tish" : "Qorong'i rejimga o'tish"}
      // Mobilda 44x44 — barmoq uchun eng kam tavsiya etiladigan o'lcham.
      // Desktopda sichqoncha aniqroq, shuning uchun 32x32 da qoladi va
      // sidebar pastidagi qator siqilib ketmaydi.
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white pointer-fine:h-8 pointer-fine:w-8"
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} className="h-[18px] w-[18px]" />
    </button>
  );
}
