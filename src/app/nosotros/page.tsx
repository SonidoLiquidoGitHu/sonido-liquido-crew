"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Disc3,
  Music2,
  Calendar,
  Headphones,
  Star,
  Heart,
  Zap,
  Loader2,
} from "lucide-react";

/* ── Stats fetch ───────────────────────────────────────── */
interface Stats {
  artistCount: number;
  releaseCount: number;
  beatCount: number;
  subscriberCount: number;
  eventCount: number;
}

/* ── Timeline milestones ───────────────────────────────── */
const MILESTONES = [
  { year: "1999", title: "Fundación", desc: "Zaque funda Sonido Líquido Crew en la Ciudad de México, sentando las bases del Hip Hop independiente mexicano." },
  { year: "2002", title: "Primeros Lanzamientos", desc: "El crew comienza a producir y distribuir su música de forma independiente, rompiendo esquemas de la industria." },
  { year: "2006", title: "Expansión del Colectivo", desc: "Nuevos talentos se integran al crew, diversificando los estilos y alcanzando nuevas audiencias." },
  { year: "2010", title: "Consolidación Nacional", desc: "SLC se posiciona como referente del Hip Hop mexicano con giras y presentaciones por todo el país." },
  { year: "2015", title: "Era Digital", desc: "El crew abraza las plataformas digitales, llegando a millones de oyentes en Spotify y YouTube." },
  { year: "2020", title: "+20 Años de Historia", desc: "Dos décadas de música, cultura y resistencia. Más de 100 lanzamientos y un legado que sigue creciendo." },
  { year: "2024", title: "Nueva Era", desc: "SLC reinventa su sonido y amplía su alcance con nuevos artistas, beats y contenido multimedia." },
];

/* ── Page ──────────────────────────────────────────────── */
export default function NosotrosPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoadingStats(false));
  }, []);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      {/* ── Hero ── */}
      <div className="mb-16 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-1.5 text-xs font-medium tracking-wider text-muted-foreground uppercase">
          <Star className="h-3.5 w-3.5 text-primary" />
          Desde 1999
        </div>
        <h1 className="mb-4 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
          Sonido Líquido <span className="text-primary">Crew</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
          El colectivo de Hip Hop más representativo de México. Fundado en 1999 en la Ciudad de México
          por Zaque, SLC ha sido pilar de la cultura hip hop nacional por más de 25 años.
        </p>
      </div>

      {/* ── Mission ── */}
      <section className="mb-16 rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 text-2xl font-black">Nuestra Misión</h2>
            <p className="leading-relaxed text-muted-foreground">
              Crear, producir y difundir Hip Hop de la más alta calidad desde México para el mundo.
              Somos un colectivo independiente que cree en el poder de la música como herramienta de
              expresión, transformación social y construcción de comunidad.
            </p>
          </div>
          <div>
            <h2 className="mb-4 text-2xl font-black">Nuestra Visión</h2>
            <p className="leading-relaxed text-muted-foreground">
              Posicionar al Hip Hop mexicano en el panorama global, demostrando que desde México se
              hace música de clase mundial. Buscamos inspirar a las nuevas generaciones a encontrar
              su voz y contar sus historias a través del arte.
            </p>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="mb-16">
        <h2 className="mb-8 text-center text-2xl font-black">SLC en Números</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[
            {
              icon: Users,
              label: "Artistas",
              value: stats?.artistCount ?? "—",
              suffix: "+",
            },
            {
              icon: Disc3,
              label: "Lanzamientos",
              value: stats?.releaseCount ?? "—",
              suffix: "+",
            },
            {
              icon: Music2,
              label: "Beats",
              value: stats?.beatCount ?? "—",
              suffix: "",
            },
            {
              icon: Headphones,
              label: "Suscriptores",
              value: stats?.subscriberCount ?? "—",
              suffix: "",
            },
            {
              icon: Calendar,
              label: "Eventos",
              value: stats?.eventCount ?? "—",
              suffix: "",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-2 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-5 text-center"
            >
              <stat.icon className="h-5 w-5 text-primary" />
              <span className="text-2xl font-black sm:text-3xl">
                {loadingStats ? (
                  <Loader2 className="inline h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  `${stat.value}${stat.suffix}`
                )}
              </span>
              <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Values ── */}
      <section className="mb-16">
        <h2 className="mb-8 text-center text-2xl font-black">Lo que Nos Define</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Zap,
              title: "Independencia",
              desc: "Somos dueños de nuestra música, nuestros tiempos y nuestras decisiones. Sin intermediarios, sin compromisos artísticos.",
            },
            {
              icon: Heart,
              title: "Comunidad",
              desc: "SLC no es solo un sello, es una familia. Creemos en la colaboración, el apoyo mutuo y en levantarnos juntos.",
            },
            {
              icon: Star,
              title: "Excelencia",
              desc: "Cada lanzamiento, cada beat, cada presentación lleva nuestro sello de calidad. No conformarnos es nuestro estándar.",
            },
          ].map((value) => (
            <div
              key={value.title}
              className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-6"
            >
              <value.icon className="mb-3 h-6 w-6 text-primary" />
              <h3 className="mb-2 text-lg font-bold">{value.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{value.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Timeline ── */}
      <section className="mb-16">
        <h2 className="mb-8 text-center text-2xl font-black">Nuestra Historia</h2>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-[#2a2a2a] sm:left-1/2" />

          <div className="flex flex-col gap-8">
            {MILESTONES.map((milestone, i) => (
              <div
                key={milestone.year}
                className={`relative flex flex-col gap-2 pl-12 sm:flex-row sm:items-start sm:gap-8 ${
                  i % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"
                }`}
              >
                {/* Dot */}
                <div className="absolute left-2.5 top-1 h-3 w-3 rounded-full border-2 border-primary bg-[#0a0a0a] sm:left-1/2 sm:-translate-x-1/2" />

                {/* Content */}
                <div
                  className={`sm:w-1/2 ${
                    i % 2 === 0 ? "sm:text-right sm:pr-12" : "sm:text-left sm:pl-12"
                  }`}
                >
                  <span className="text-sm font-black text-primary">{milestone.year}</span>
                  <h3 className="text-base font-bold">{milestone.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {milestone.desc}
                  </p>
                </div>

                {/* Spacer for the other side */}
                <div className="hidden sm:block sm:w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Collective description ── */}
      <section className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6 text-center sm:p-10">
        <h2 className="mb-4 text-2xl font-black">Más que Música</h2>
        <p className="mx-auto max-w-2xl leading-relaxed text-muted-foreground">
          Sonido Líquido Crew es un movimiento cultural. Además de producir música, organizamos
          eventos, apoyamos a nuevos talentos, creamos contenido audiovisual y construimos puentes
          entre la cultura hip hop mexicana y el mundo. Con +160 lanzamientos y más de 25 años de
          historia, SLC sigue siendo el colectivo más representativo del Hip Hop en México.
        </p>
      </section>
    </main>
  );
}
