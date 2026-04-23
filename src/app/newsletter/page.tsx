"use client";

import { Mail, Music2, Gift, Mic2, Bell, Zap } from "lucide-react";
import { NewsletterForm } from "@/components/newsletter-form";

/* ── Perks data ── */
const PERKS = [
  {
    icon: Music2,
    title: "Remixes Exclusivos",
    desc: "Versiones especiales que no encontrarás en ninguna plataforma de streaming.",
  },
  {
    icon: Gift,
    title: "Beats Gratis",
    desc: "Descargas exclusivas de beats del crew, solo para suscriptores.",
  },
  {
    icon: Mic2,
    title: "Acceso Anticipado",
    desc: "Sé el primero en escuchar los nuevos lanzamientos antes que nadie.",
  },
  {
    icon: Bell,
    title: "Noticias del Crew",
    desc: "Eventos, conciertos y novedades directo a tu correo sin spam.",
  },
  {
    icon: Zap,
    title: "Contenido Exclusivo",
    desc: "Detrás de cámaras, sesiones de grabación y contenido solo para la comunidad.",
  },
];

/* ── Page ──────────────────────────────────────────────── */
export default function NewsletterPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Hero */}
      <div className="mb-16 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium tracking-wider text-muted-foreground uppercase">
          <Mail className="h-3.5 w-3.5 text-primary" />
          Newsletter
        </div>
        <h1 className="mb-4 text-4xl font-black tracking-tight sm:text-5xl">
          Anótate al <span className="text-primary">Movimiento</span>
        </h1>
        <p className="mx-auto max-w-lg text-lg text-muted-foreground">
          Recibe contenido exclusivo, beats gratis y noticias del crew directamente en tu correo.
          Sin spam, solo lo que importa.
        </p>
      </div>

      {/* Sign-up form */}
      <div className="mx-auto mb-16 max-w-lg">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="mb-2 text-center text-xl font-bold">Suscríbete</h2>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Ingresa tu correo y únete a la comunidad de SLC.
          </p>
          <NewsletterForm variant="hero" />
        </div>
      </div>

      {/* Perks */}
      <div className="mb-16">
        <h2 className="mb-8 text-center text-2xl font-black">Qué Recibirás</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PERKS.map((perk) => (
            <div
              key={perk.title}
              className="rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30"
            >
              <perk.icon className="mb-3 h-6 w-6 text-primary" />
              <h3 className="mb-2 text-base font-bold">{perk.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{perk.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="rounded-2xl border border-border bg-card p-6 text-center sm:p-10">
        <h2 className="mb-3 text-2xl font-black">¿Qué Esperas?</h2>
        <p className="mx-auto mb-6 max-w-md text-muted-foreground">
          Únete a miles de fans del Hip Hop mexicano que ya reciben contenido exclusivo del crew.
        </p>
        <NewsletterForm variant="hero" />
      </div>
    </main>
  );
}
