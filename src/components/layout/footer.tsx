"use client";

import Link from "next/link";
import { Disc3 } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/artistas", label: "Artistas" },
  { href: "/discografia", label: "Discografía" },
  { href: "/artistas#beats", label: "Beats" },
  { href: "/artistas#videos", label: "Videos" },
  { href: "/artistas#eventos", label: "Eventos" },
];

export function Footer() {
  return (
    <footer className="border-t border-[#2a2a2a] bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <Disc3 className="h-6 w-6 text-primary" />
              <div className="flex flex-col leading-none">
                <span className="text-sm font-bold tracking-wider">SONIDO LÍQUIDO</span>
                <span className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">Hip Hop México</span>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              El colectivo de Hip Hop más representativo de México. Fundado en 1999 en la Ciudad de México por Zaque.
              +160 lanzamientos, +25 años de historia.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="mb-4 text-xs font-bold tracking-widest text-muted-foreground uppercase">Navegación</h3>
            <nav className="flex flex-col gap-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* More */}
          <div>
            <h3 className="mb-4 text-xs font-bold tracking-widest text-muted-foreground uppercase">Más</h3>
            <nav className="flex flex-col gap-2">
              <Link href="/artistas" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Nosotros
              </Link>
              <Link href="/artistas" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Contacto
              </Link>
              <Link href="/artistas" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Prensa
              </Link>
            </nav>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="mb-4 text-xs font-bold tracking-widest text-muted-foreground uppercase">Newsletter</h3>
            <p className="mb-3 text-sm text-muted-foreground">
              Obtén remixes exclusivos, beats e información actualizada.
            </p>
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="tu@email.com"
                className="flex-1 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Suscribirse
              </button>
            </form>
          </div>
        </div>

        <div className="mt-10 border-t border-[#2a2a2a] pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Sonido Líquido Crew. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
