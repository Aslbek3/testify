"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";

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
    <Button type="button" variant="ghost-dark" onClick={toggle}>
      {theme === "dark" ? "☀️ Yorug' rejim" : "🌙 Qorong'i rejim"}
    </Button>
  );
}
