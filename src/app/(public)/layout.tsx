"use client";

import { ColorModeProvider } from "@/components/ColorModeProvider";
import { Footer } from "@/components/public/Footer";
import { Header } from "@/components/public/Header";
import { usePageViewTracking } from "@/hooks/use-analytics";
import { Suspense, lazy } from "react";

// Lazy load non-critical client components
const SoundEffectsWrapper = lazy(() =>
  import("@/components/public/effects/SoundEffects").then((m) => ({
    default: () => (
      <m.SoundProvider>
        <m.SoundToggle />
      </m.SoundProvider>
    ),
  })),
);

const NewsletterPopup = lazy(() =>
  import("@/components/public/NewsletterPopup").then((m) => ({
    default: m.NewsletterPopup,
  })),
);

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Track all page views across public pages
  usePageViewTracking();

  return (
    <ColorModeProvider defaultMode="dark">
      <div className="flex flex-col min-h-screen bg-[var(--slc-background)] text-[var(--slc-text)] transition-colors duration-200">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />

        {/* Non-critical interactive elements - loaded after main content */}
        <Suspense fallback={null}>
          <SoundEffectsWrapper />
        </Suspense>

        <Suspense fallback={null}>
          <NewsletterPopup />
        </Suspense>
      </div>
    </ColorModeProvider>
  );
}
