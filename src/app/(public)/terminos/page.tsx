import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos de Uso | Sonido Líquido Crew",
  description:
    "Términos y condiciones de uso del sitio web de Sonido Líquido Crew.",
};

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-[var(--slc-background)] text-[var(--slc-text)]">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-oswald text-4xl uppercase mb-8">Términos de Uso</h1>

        <div className="prose prose-invert max-w-none space-y-6 text-sm leading-relaxed">
          <p className="text-slc-muted">Última actualización: Mayo 2026</p>

          <section>
            <h2 className="font-oswald text-xl uppercase mt-8 mb-3">
              1. Aceptación de los Términos
            </h2>
            <p>
              Al acceder y utilizar el sitio web sonidoliquido.com (el
              &quot;Sitio&quot;), usted acepta estar sujeto a estos Términos de
              Uso. Si no está de acuerdo con alguno de estos términos, le
              pedimos que no utilice nuestro Sitio. Sonido Líquido Crew
              (&quot;SLC&quot;) se reserva el derecho de modificar estos
              términos en cualquier momento, y el uso continuado del Sitio
              constituye la aceptación de dichos cambios.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl uppercase mt-8 mb-3">
              2. Descripción del Servicio
            </h2>
            <p>
              sonidoliquido.com es el sitio web oficial de Sonido Líquido Crew,
              un colectivo de hip hop mexicano. El Sitio proporciona información
              sobre artistas, lanzamientos musicales, eventos, galería
              fotográfica, playlists curadas, y contenido de comunidad. También
              ofrece integraciones con plataformas como Spotify, Facebook,
              Instagram y TikTok para compartir y publicar contenido de manera
              automatizada.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl uppercase mt-8 mb-3">
              3. Uso Aceptable
            </h2>
            <p>Al utilizar nuestro Sitio, usted se compromete a:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>
                No utilizar el Sitio para fines ilegales o no autorizados.
              </li>
              <li>
                No intentar acceder a áreas restringidas del Sitio o a los
                sistemas del servidor.
              </li>
              <li>
                No transmitir contenido malicioso, spam o material que infrinja
                derechos de terceros.
              </li>
              <li>
                Respetar los derechos de propiedad intelectual de SLC y de
                terceros.
              </li>
              <li>
                No utilizar robots, scrapers u otros medios automatizados para
                acceder al Sitio sin autorización.
              </li>
              <li>
                Proporcionar información veraz en formularios y secciones
                interactivas.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-oswald text-xl uppercase mt-8 mb-3">
              4. Propiedad Intelectual
            </h2>
            <p>
              Todo el contenido del Sitio — incluyendo pero no limitado a
              textos, imágenes, fotografías, logos, diseños, música, audio,
              video, software y código — es propiedad de Sonido Líquido Crew o
              de sus respectivos autores y está protegido por las leyes de
              propiedad intelectual aplicables. Queda prohibida la reproducción,
              distribución, modificación o uso comercial de cualquier contenido
              sin autorización expresa por escrito.
            </p>
            <p className="mt-3">
              Las fotografías de la galería son propiedad de sus respectivos
              fotógrafos. Las carátulas de discos y el contenido musical son
              propiedad de los artistas y sellos discográficos correspondientes.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl uppercase mt-8 mb-3">
              5. Integraciones con Redes Sociales
            </h2>
            <p>
              El Sitio utiliza las APIs oficiales de Meta (Facebook/Instagram),
              TikTok y Spotify para ofrecer funcionalidades de publicación
              automatizada y compartición de contenido. Estas integraciones
              funcionan bajo los siguientes términos:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>
                <strong>Publicación automatizada:</strong> SLC publica contenido
                de su propio sitio web en sus cuentas oficiales de redes
                sociales de manera automática. No se publica contenido en nombre
                de los usuarios sin su consentimiento explícito.
              </li>
              <li>
                <strong>Funciones de compartir:</strong> Los usuarios pueden
                compartir contenido del Sitio en sus propias redes sociales
                utilizando los botones de compartir proporcionados. Esta acción
                es voluntaria y está sujeta a los términos de cada plataforma.
              </li>
              <li>
                <strong>Playlists de Spotify:</strong> Los usuarios pueden crear
                playlists de Spotify a través del Sitio, lo cual requiere
                autenticación con Spotify y está sujeto a los términos de
                servicio de Spotify.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-oswald text-xl uppercase mt-8 mb-3">
              6. Contenido de la Comunidad
            </h2>
            <p>
              Ciertas secciones del Sitio permiten a los usuarios enviar
              contenido (fotografías, comentarios, historias). Al enviar
              contenido, usted otorga a SLC una licencia no exclusiva, mundial y
              gratuita para usar, reproducir y mostrar dicho contenido en
              relación con los servicios del Sitio. Usted es responsable de
              asegurar que el contenido enviado no infringe derechos de
              terceros.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl uppercase mt-8 mb-3">
              7. Limitación de Responsabilidad
            </h2>
            <p>
              El Sitio se proporciona &quot;tal cual&quot; y &quot;según
              disponibilidad&quot;. SLC no garantiza que el Sitio estará
              disponible de manera ininterrumpida o libre de errores. En la
              máxima medida permitida por la ley, SLC no será responsable por
              daños directos, indirectos, incidentales, consecuentes o punitivos
              derivados del uso o la imposibilidad de uso del Sitio.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl uppercase mt-8 mb-3">
              8. Enlaces a Terceros
            </h2>
            <p>
              El Sitio puede contener enlaces a sitios web de terceros. SLC no
              es responsable del contenido, las políticas de privacidad ni las
              prácticas de dichos sitios. Le recomendamos revisar los términos y
              políticas de cualquier sitio de terceros antes de proporcionar
              información personal.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl uppercase mt-8 mb-3">
              9. Ley Aplicable
            </h2>
            <p>
              Estos Términos de Uso se rigen por las leyes de los Estados Unidos
              Mexicanos. Cualquier disputa relacionada con el uso del Sitio será
              sometida a la jurisdicción de los tribunales de la Ciudad de
              México.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl uppercase mt-8 mb-3">
              10. Contacto
            </h2>
            <p>Para preguntas sobre estos Términos de Uso, contáctenos en:</p>
            <p className="mt-2">
              Sonido Líquido Crew
              <br />
              Email: contacto@sonidoliquido.com
              <br />
              Sitio web: sonidoliquido.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
