import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

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
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
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
