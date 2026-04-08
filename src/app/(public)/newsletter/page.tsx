import { NewsletterForm } from "@/components/public/NewsletterForm";
import { Mail, Gift, Headphones, Calendar, Bell } from "lucide-react";

export const metadata = {
  title: "Newsletter | Sonido Líquido Crew",
  description: "Suscríbete al newsletter de Sonido Líquido Crew y recibe noticias exclusivas, nuevos lanzamientos y ofertas especiales.",
};

const benefits = [
  {
    icon: <Headphones className="w-6 h-6" />,
    title: "Lanzamientos Exclusivos",
    description: "Sé el primero en escuchar nuevos tracks y álbumes antes que nadie.",
  },
  {
    icon: <Gift className="w-6 h-6" />,
    title: "Descuentos Especiales",
    description: "Accede a ofertas exclusivas en la tienda oficial y eventos VIP.",
  },
  {
    icon: <Calendar className="w-6 h-6" />,
    title: "Eventos y Conciertos",
    description: "Entérate primero de las fechas de shows y preventa de boletos.",
  },
  {
    icon: <Bell className="w-6 h-6" />,
    title: "Noticias del Crew",
    description: "Actualizaciones sobre los artistas, colaboraciones y más.",
  },
];

export default function NewsletterPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 newsletter-gradient opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slc-black/50 to-slc-black" />

        <div className="section-container relative">
          <div className="max-w-2xl mx-auto text-center">
            {/* Icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center">
              <Mail className="w-10 h-10 text-primary" />
            </div>

            <h1 className="font-oswald text-4xl sm:text-5xl md:text-6xl uppercase">
              Únete a la
              <span className="block text-primary">Familia</span>
            </h1>

            <p className="text-slc-muted text-lg mt-6 leading-relaxed">
              Suscríbete a nuestro newsletter y recibe contenido exclusivo,
              noticias sobre nuevos lanzamientos y acceso anticipado a eventos.
            </p>

            {/* Newsletter Form */}
            <div className="mt-10 max-w-md mx-auto">
              <NewsletterForm source="newsletter-page" />
            </div>

            <p className="text-slc-muted text-xs mt-4">
              No spam. Puedes darte de baja en cualquier momento.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-slc-darker">
        <div className="section-container">
          <div className="text-center mb-12">
            <h2 className="section-title">¿Qué recibirás?</h2>
            <p className="section-subtitle mt-2">
              Beneficios exclusivos para nuestros suscriptores
            </p>
            <div className="section-divider" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex gap-4 p-6 bg-slc-card border border-slc-border rounded-xl hover:border-primary/50 transition-colors"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  {benefit.icon}
                </div>
                <div>
                  <h3 className="font-oswald text-lg uppercase mb-1">{benefit.title}</h3>
                  <p className="text-slc-muted text-sm">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 border-t border-slc-border">
        <div className="section-container">
          <div className="text-center max-w-2xl mx-auto">
            <h3 className="font-oswald text-2xl uppercase mb-4">
              Únete a miles de fans
            </h3>
            <p className="text-slc-muted mb-8">
              Somos una comunidad de amantes del Hip Hop mexicano.
              Únete y sé parte de la familia Sonido Líquido.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-slc-card border border-slc-border rounded-lg">
                <div className="font-oswald text-2xl text-primary">1,500+</div>
                <div className="text-xs text-slc-muted uppercase">Suscriptores</div>
              </div>
              <div className="p-4 bg-slc-card border border-slc-border rounded-lg">
                <div className="font-oswald text-2xl text-primary">48</div>
                <div className="text-xs text-slc-muted uppercase">Emails al año</div>
              </div>
              <div className="p-4 bg-slc-card border border-slc-border rounded-lg">
                <div className="font-oswald text-2xl text-primary">98%</div>
                <div className="text-xs text-slc-muted uppercase">Satisfacción</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 newsletter-gradient">
        <div className="section-container text-center">
          <h2 className="font-oswald text-3xl uppercase text-white mb-4">
            ¿Listo para unirte?
          </h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            No te pierdas nada. Suscríbete ahora y comienza a recibir contenido exclusivo.
          </p>
          <div className="max-w-md mx-auto">
            <NewsletterForm source="newsletter-cta" variant="inline" />
          </div>
        </div>
      </section>
    </div>
  );
}
