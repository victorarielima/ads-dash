import type { Metadata } from "next";
import { Inter, Sofia_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const sofiaSans = Sofia_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Evino Ads Analytics",
  description: "Dashboard de performance de mídia Meta Ads - Evino",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${sofiaSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="font-sans bg-white text-evino-ink antialiased min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
