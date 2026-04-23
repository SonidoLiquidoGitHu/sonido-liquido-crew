"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Disc3 } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Inicio" },
  { href: "/artistas", label: "Artistas" },
  { href: "/discografia", label: "Discografía" },
  { href: "/beats", label: "Beats" },
  { href: "/proximos", label: "Próximos" },
  { href: "/videos", label: "Videos" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/playlists", label: "Playlists" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-[#0a0a0a]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <Disc3 className="h-7 w-7 text-primary" />
          <div className="flex flex-col leading-none">
            <span className="text-base font-bold tracking-wider text-foreground">SONIDO LÍQUIDO</span>
            <span className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">Hip Hop México</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="https://open.spotify.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 sm:inline-flex"
          >
            Escuchar en Spotify
          </a>
          <button
            className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-[#0a0a0a] lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <a
              href="https://open.spotify.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 rounded-full bg-primary px-4 py-2 text-center text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Escuchar en Spotify
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
