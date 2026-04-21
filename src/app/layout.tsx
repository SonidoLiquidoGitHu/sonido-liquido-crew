import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ErrorBoundary } from "@/components/error-boundary";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sonido Líquido Crew | Hip Hop Mexicano desde 1999",
  description:
    "Sonido Líquido Crew es el colectivo de Hip Hop más representativo de México. Fundado en 1999 en la Ciudad de México por Zaque. +160 lanzamientos, +25 años de historia.",
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased bg-background text-foreground`}
      >
        <Header />
        <ErrorBoundary source="layout:root">
          <div className="flex-1">{children}</div>
        </ErrorBoundary>
        <Footer />
      </body>
    </html>
  );
}
