import type { Metadata, Viewport } from "next";
import { Oswald, Barlow } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
  display: "swap",
  preload: true,
});
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
  preload: true,
});
// Viewport configuration for mobile optimization
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#000000",
};
export const metadata: Metadata = {
  title: "Sonido Líquido Crew | Hip Hop Mexicano desde 1999 | CDMX",
  description:
    "Sonido Líquido Crew es el colectivo de Hip Hop más representativo de México. Fundado en 1999 en la Ciudad de México. +160 lanzamientos, +25 años de historia. Lo más avanzado del Hip Hop mexicano.",
  keywords: [
    "hip hop",
    "hip hop mexicano",
    "rap",
    "cdmx",
    "sonido liquido",
    "zaque",
    "música",
    "beatmaker",
    "producer",
    "dj",
    "mc",
  ],
  authors: [{ name: "Sonido Líquido Crew" }],
  openGraph: {
    title: "Sonido Líquido Crew | Hip Hop Mexicano desde 1999",
    description:
      "El colectivo de Hip Hop más representativo de México. +160 lanzamientos, +25 años de historia.",
    url: "https://sonidoliquido.com",
    siteName: "Sonido Líquido Crew",
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sonido Líquido Crew | Hip Hop Mexicano desde 1999",
    description:
      "El colectivo de Hip Hop más representativo de México. +160 lanzamientos, +25 años de historia.",
  },
  robots: {
    index: true,
    follow: true,
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <head>
        {/* DNS Prefetch for external resources */}
        <link rel="dns-prefetch" href="https://i.scdn.co" />
        <link rel="dns-prefetch" href="https://open.spotify.com" />
        <link rel="dns-prefetch" href="https://i.ytimg.com" />
        <link rel="dns-prefetch" href="https://www.youtube.com" />
        <link rel="dns-prefetch" href="https://dl.dropboxusercontent.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        {/* Preconnect for critical resources */}
        <link rel="preconnect" href="https://i.scdn.co" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${oswald.variable} ${barlow.variable} antialiased`}>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
              color: "#e5e5e5",
            },
          }}
        />
      </body>
    </html>
  );
}
