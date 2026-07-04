"use client";

import { useCallback, useEffect, useState } from "react";

// ===========================================
// SECTION NAVIGATION DOTS (Desktop only)
// Fixed on right side of viewport
// Shows which section user is in, click to jump
// ===========================================

interface SectionNavDot {
  id: string;
  label: string;
}

const SECTIONS: SectionNavDot[] = [
  { id: "lanzamientos", label: "Lanzamientos" },
  { id: "hero", label: "Inicio" },
  { id: "artistas", label: "Artistas" },
  { id: "discografia", label: "Discografía" },
  { id: "beats", label: "Beats" },
  { id: "musica", label: "Música" },
  { id: "videos", label: "Videos" },
  { id: "reels", label: "Reels" },
  { id: "galeria", label: "Galería" },
  { id: "eventos", label: "Eventos" },
  { id: "newsletter", label: "Newsletter" },
];

export function SectionNavDots() {
  const [activeSection, setActiveSection] = useState<string>("");
  const [hoveredDot, setHoveredDot] = useState<string | null>(null);

  const updateActiveSection = useCallback(() => {
    const scrollY = window.scrollY + window.innerHeight / 3;

    for (let i = SECTIONS.length - 1; i >= 0; i--) {
      const el = document.getElementById(SECTIONS[i].id);
      if (el && el.offsetTop <= scrollY) {
        setActiveSection(SECTIONS[i].id);
        return;
      }
    }
    setActiveSection(SECTIONS[0]?.id || "");
  }, []);

  useEffect(() => {
    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    return () => window.removeEventListener("scroll", updateActiveSection);
  }, [updateActiveSection]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav
      className="hidden xl:flex fixed right-4 top-1/2 -translate-y-1/2 z-40 flex-col gap-3"
      aria-label="Sección de navegación"
    >
      {SECTIONS.map((section) => (
        <button
          key={section.id}
          onClick={() => scrollTo(section.id)}
          onMouseEnter={() => setHoveredDot(section.id)}
          onMouseLeave={() => setHoveredDot(null)}
          aria-label={`Ir a ${section.label}`}
          className="group relative flex items-center justify-end"
        >
          {/* Tooltip */}
          <span
            className={`
              absolute right-6 px-2 py-1 rounded text-xs font-medium whitespace-nowrap
              bg-slc-card border border-slc-border text-white shadow-lg
              transition-all duration-200
              ${hoveredDot === section.id ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2 pointer-events-none"}
            `}
          >
            {section.label}
          </span>

          {/* Dot */}
          <span
            className={`
              w-2.5 h-2.5 rounded-full transition-all duration-300
              ${
                activeSection === section.id
                  ? "bg-primary scale-125 shadow-sm shadow-primary/50"
                  : "bg-white/20 hover:bg-white/50"
              }
            `}
          />
        </button>
      ))}
    </nav>
  );
}
