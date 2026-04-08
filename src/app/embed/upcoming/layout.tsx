import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Próximos Lanzamientos - Sonido Líquido Crew Widget",
  description: "Widget embebible de próximos lanzamientos",
  robots: "noindex, nofollow",
};

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-transparent">
        {children}
      </body>
    </html>
  );
}
