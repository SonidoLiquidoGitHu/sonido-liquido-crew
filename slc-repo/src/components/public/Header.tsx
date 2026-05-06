"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColorModeToggle } from "@/components/ColorModeProvider";

const navLinks = [
  { href: "/", label: "Inicio" },
  { href: "/artistas", label: "Artistas" },
  { href: "/discografia", label: "Discografía" },
  { href: "/beats", label: "Beats" },
  { href: "/videos", label: "Videos" },
  { href: "/galeria", label: "Galería" },
  { href: "/eventos", label: "Eventos" },
  { href: "/comunidad", label: "Comunidad" },
  { href: "/playlists", label: "Playlists" },
  // Prensa is hidden from public nav - accessible via direct URL for media professionals
  { href: "/tienda", label: "Tienda" },
];

export function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slc-border bg-slc-black/95 backdrop-blur supports-[backdrop-filter]:bg-slc-black/80">
      <div className="section-container">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-slc-card border border-slc-border flex items-center justify-center transition-all group-hover:border-primary group-hover:shadow-[0_0_15px_rgba(249,115,22,0.3)]">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
            </div>
            <div>
              <h1 className="font-oswald text-lg uppercase tracking-wider leading-tight">
                Sonido Líquido
              </h1>
              <p className="text-xs text-primary uppercase tracking-widest">
                Hip Hop México
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-2 text-sm font-medium uppercase tracking-wide transition-colors rounded-md",
                  pathname === link.href
                    ? "text-white bg-slc-card"
                    : "text-slc-muted hover:text-white hover:bg-slc-card/50"
                )}
              >
                {link.label}
              </Link>
            ))}
            <ColorModeToggle className="ml-2" />
          </nav>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-slc-border animate-fade-in">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 text-sm font-medium uppercase tracking-wide transition-colors rounded-md",
                    pathname === link.href
                      ? "text-white bg-slc-card"
                      : "text-slc-muted hover:text-white hover:bg-slc-card/50"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
