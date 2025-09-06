import type React from "react";
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { AudioPlayerProvider } from "@/app/contexts/audio-player-context";
import { AuthProvider } from "@/app/contexts/auth-context";
import { ToastProvider } from "@/app/contexts/toast-context";
import { ConditionalAudioConsole } from "@/app/components/conditional-audio-console";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "NewVoice｜時間と労力を奪わない、新時代のニュース",
  description:
    "ニュースはもう、探さなくていい。見なくていい。「NewVoice」は、ながらで聴くだけなのに、解説付きでトピックをとことん深掘りできる。時間も労力もかけずに「そうだったのか！」なニュース体験を。",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon_16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon_32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon_48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: "/favicon_192.png", sizes: "192x192", type: "image/png" }],
    shortcut: "/favicon_32.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${manrope.variable} antialiased`}>
      <head>
        <link
          rel="icon"
          href="/favicon_16.png"
          sizes="16x16"
          type="image/png"
        />
        <link
          rel="icon"
          href="/favicon_32.png"
          sizes="32x32"
          type="image/png"
        />
        <link
          rel="icon"
          href="/favicon_48.png"
          sizes="48x48"
          type="image/png"
        />
        <link rel="apple-touch-icon" href="/favicon_192.png" sizes="192x192" />
        <link rel="shortcut icon" href="/favicon_32.png" />
      </head>
      <body className="font-display prevent-horizontal-scroll">
        <ToastProvider>
          <AuthProvider>
            <AudioPlayerProvider>
              {children}
              <ConditionalAudioConsole />
            </AudioPlayerProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
