import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { SocialLinks } from "@/components/public/SocialLinks";
import { NewsletterForm } from "@/components/public/NewsletterForm";
import { Button } from "@/components/ui/button";
import { Mail, MapPin, Phone, Calendar, Users, Disc3, Award } from "lucide-react";

export const metadata = {
  title: "Nosotros | Sonido Líquido Crew",
  description: "Conoce la historia del colectivo de Hip Hop más representativo de México. Fundado en 1999 en la Ciudad de México.",
};

const timeline = [
  { year: "1999", event: "Fundación de Sonido Líquido Crew en CDMX" },
  { year: "2002", event: "Primeros lanzamientos independientes y presentaciones en vivo" },
  { year: "2005", event: "Consolidación del roster con artistas clave" },
  { year: "2010", event: "Expansión digital y presencia en plataformas de streaming" },
  { year: "2015", event: "100 lanzamientos acumulados" },
  { year: "2020", event: "Celebración de 21 años con compilados especiales" },
  { year: "2024", event: "+160 lanzamientos, +25 años de historia" },
];

const values = [
  {
    icon: <Users className="w-8 h-8" />,
    title: "Comunidad",
    description: "Somos una familia de artistas que comparten la misma pasión por el Hip Hop y la cultura urbana.",
  },
  {
    icon: <Disc3 className="w-8 h-8" />,
    title: "Autenticidad",
    description: "Nuestro sonido es genuino, sin filtros ni pretensiones. Música real para gente real.",
  },
  {
    icon: <Award className="w-8 h-8" />,
    title: "Excelencia",
    description: "Buscamos la perfección en cada beat, cada rima y cada producción que lanzamos.",
  },
];

export default function NosotrosPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />
        <div className="section-container relative">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block px-4 py-1.5 bg-primary/20 text-primary text-xs font-medium uppercase tracking-wider rounded-full mb-4">
              Desde 1999
            </span>
            <h1 className="font-oswald text-4xl sm:text-5xl md:text-6xl uppercase">
              Lo más avanzado del
              <span className="block text-primary">Hip Hop mexicano</span>
            </h1>
            <p className="text-slc-muted text-lg mt-6 leading-relaxed">
              Sonido Líquido Crew es el colectivo de Hip Hop más representativo de México.
              Fundado en 1999 en la Ciudad de México, hemos construido una comunidad
              de artistas que han definido el sonido del rap mexicano por más de dos décadas.
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-slc-darker">
        <div className="section-container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="text-center p-8 bg-slc-card border border-slc-border rounded-xl"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  {value.icon}
                </div>
                <h3 className="font-oswald text-xl uppercase mb-3">{value.title}</h3>
                <p className="text-slc-muted">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* History Timeline */}
      <section className="py-20">
        <div className="section-container">
          <div className="text-center mb-12">
            <h2 className="section-title">Nuestra Historia</h2>
            <p className="section-subtitle mt-2">
              Más de 25 años construyendo el movimiento
            </p>
            <div className="section-divider" />
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slc-border" />

              {timeline.map((item, index) => (
                <div key={index} className="relative flex gap-6 pb-8 last:pb-0">
                  {/* Timeline dot */}
                  <div className="relative z-10 flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-8 border-b border-slc-border last:border-0">
                    <span className="text-primary font-oswald text-2xl">{item.year}</span>
                    <p className="text-slc-text mt-1">{item.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-slc-card border-y border-slc-border">
        <div className="section-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="font-oswald text-4xl md:text-5xl text-primary font-bold">15+</div>
              <div className="text-slc-muted text-sm uppercase tracking-wider mt-2">Artistas</div>
            </div>
            <div>
              <div className="font-oswald text-4xl md:text-5xl text-primary font-bold">160+</div>
              <div className="text-slc-muted text-sm uppercase tracking-wider mt-2">Lanzamientos</div>
            </div>
            <div>
              <div className="font-oswald text-4xl md:text-5xl text-primary font-bold">500+</div>
              <div className="text-slc-muted text-sm uppercase tracking-wider mt-2">Videos</div>
            </div>
            <div>
              <div className="font-oswald text-4xl md:text-5xl text-primary font-bold">25+</div>
              <div className="text-slc-muted text-sm uppercase tracking-wider mt-2">Años</div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20">
        <div className="section-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div>
              <h2 className="font-oswald text-3xl uppercase mb-6">Contacto</h2>
              <p className="text-slc-muted mb-8">
                Para booking, colaboraciones, prensa o cualquier consulta,
                no dudes en contactarnos.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slc-card border border-slc-border flex items-center justify-center text-primary">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slc-muted uppercase tracking-wider">Email</div>
                    <a href="mailto:prensasonidoliquido@gmail.com" className="text-white hover:text-primary transition-colors">
                      prensasonidoliquido@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slc-card border border-slc-border flex items-center justify-center text-primary">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slc-muted uppercase tracking-wider">Teléfono</div>
                    <a href="tel:+525528011881" className="text-white hover:text-primary transition-colors">
                      +52 55 2801 1881
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slc-card border border-slc-border flex items-center justify-center text-primary">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slc-muted uppercase tracking-wider">Ubicación</div>
                    <span className="text-white">Ciudad de México, CDMX</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-sm uppercase tracking-wider text-slc-muted mb-4">Síguenos</h3>
                <SocialLinks size="lg" />
              </div>
            </div>

            {/* Newsletter */}
            <div className="bg-slc-card border border-slc-border rounded-xl p-8">
              <h3 className="font-oswald text-2xl uppercase mb-4">Únete a la Familia</h3>
              <p className="text-slc-muted mb-6">
                Suscríbete para recibir noticias exclusivas, nuevos lanzamientos
                y ofertas especiales directamente en tu correo.
              </p>
              <NewsletterForm source="about-page" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-primary/20 to-orange-500/10">
        <div className="section-container text-center">
          <h2 className="font-oswald text-3xl uppercase mb-4">
            Explora nuestra música
          </h2>
          <p className="text-slc-muted mb-8 max-w-xl mx-auto">
            Descubre más de 160 lanzamientos de los mejores artistas del Hip Hop mexicano.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/artistas">Ver Artistas</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/discografia">Ver Discografía</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
