"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

export function BackToTopFab() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // Show after scrolling past the first viewport
      setVisible(window.scrollY > window.innerHeight * 0.8);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="Volver arriba"
      className={`
        fixed bottom-6 right-6 z-50
        w-12 h-12 rounded-full
        bg-primary hover:bg-primary/90 text-white
        shadow-lg shadow-primary/30
        flex items-center justify-center
        transition-all duration-300
        hover:scale-110 active:scale-95
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}
      `}
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
