import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

/** Matn shrifti — uzun izoh va jadval mazmuni uchun. */
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

/**
 * Sarlavhalar va katta raqamlar uchun. Ilgari butun ilova bitta shriftning
 * bitta o'lchamida (14px) yozilgan edi — sarlavha bilan matn faqat
 * qalinligi bilan farq qilardi va ekran gazeta ustuniga o'xshab qolardi.
 */
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

/** Jadvaldagi raqamlar uchun — ustunlar tik turishi kerak. */
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Testify",
  description: "Avtomaktablar uchun PDD test tayyorgarlik platformasi",
};

// Sahifa chizilishidan oldin ishlaydi — aks holda foydalanuvchi aniq
// tanlagan mavzu bir lahzaga noto'g'ri (light/dark) ko'rinib, keyin
// to'g'risiga almashib qolardi (FOUC).
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('testify-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="uz"
      className={`${dmSans.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
      // THEME_INIT_SCRIPT hidratsiyadan oldin data-theme'ni qo'shadi —
      // bu ataylab qilingan server/klient farqi, React ogohlantirmasligi kerak.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-bg text-text">{children}</body>
    </html>
  );
}
