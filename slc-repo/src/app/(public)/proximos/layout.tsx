import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Próximos Lanzamientos | Sonido Líquido Crew",
  description: "Descubre los próximos lanzamientos de Sonido Líquido Crew. Haz presave y sé el primero en escucharlos.",
  openGraph: {
    title: "Próximos Lanzamientos | Sonido Líquido Crew",
    description: "Descubre los próximos lanzamientos de Sonido Líquido Crew. Haz presave y sé el primero en escucharlos.",
  },
};

export default function ProximosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
