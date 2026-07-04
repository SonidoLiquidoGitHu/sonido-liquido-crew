import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad | Sonido Líquido Crew",
  description:
    "Política de privacidad y protección de datos de Sonido Líquido Crew.",
};

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-[var(--slc-background)] text-[var(--slc-text)]">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-oswald text-4xl uppercase mb-8">
          Política de Privacidad
        </h1>

        <div className="prose prose-invert max-w-none space-y-6 text-sm leading-relaxed">
          <p className="text-slc-muted">Última actualización: Mayo 2026</p>

          <section>
            <h2 className="font-oswald text-xl uppercase mt-8 mb-3">
              1. Información que Recopilamos
            </h2>
            <p>
              Sonido Líquido Crew (&quot;SLC&quot;, &quot;nosotros&quot;) opera
              el sitio web sonidoliquido.com. Recopilamos información limitada
              necesaria para el funcionamiento del sitio y nuestros servicios:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>
                <strong>Información de navegación:</strong> Direcciones IP, tipo
                de navegador, páginas visitadas y tiempo de permanencia,
                recopilados automáticamente mediante cookies analíticas.
              </li>
              <li>
                <strong>Información de contacto:</strong> Correo electrónico
                proporcionado voluntariamente al suscribirse a nuestro
                newsletter o formularios de contacto.
              </li>
              <li>
                <strong>Contenido enviado:</strong> Fotografías, videos o textos
                enviados a través de formularios de la comunidad o secciones
                colaborativas.
              </li>
              <li>
                <strong>Datos de redes sociales:</strong> Información pública de
                su perfil cuando interactúa con nuestras integraciones de
                Facebook, Instagram, TikTok o Spotify.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-oswald text-xl uppercase mt-8 mb-3">
              2. Uso de la Información
            </h2>
            <p>Utilizamos la información recopilada para:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Operar y mejorar nuestro sitio web y servicios.</li>
              <li>
                Enviar comunicaciones sobre nuevos lanzamientos, eventos y
                novedades del crew.
              </li>
              <li>
                Publicar contenido en nuestras redes sociales de manera
                automatizada (Facebook, Instagram, TikTok).
              </li>
              <li>
                Proporcionar funcionalidades interactivas como playlists
                colaborativas y comunidad.
              </li>
              <li>
                Analizar el uso del sitio para mejorar la experiencia del
                usuario.
              </li>
              <li>Cumplir con obligaciones legales aplicables.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-oswald text-xl uppercase mt-8 mb-3">
              3. Integraciones con Terceros
            </h2>
            <p>
              Nuestro sitio se integra con plataformas de terceros para ofrecer
              funcionalidades específicas:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>
                <strong>Meta (Facebook/Instagram):</strong> Publicación
                automatizada de contenido mediante la Graph API de Meta. Solo
                publicamos en nuestra propia página y cuenta de negocios.
              </li>
              <li>
                <strong>TikTok:</strong> Publicación automatizada de contenido
                mediante la Content Posting API de TikTok. Solo publicamos en
                nuestra propia cuenta @sonidoliquidocrew. Los scopes solicitados
                son: user.info.basic, user.info.profile, user.info.stats,
                video.list y video.publish.
              </li>
              <li>
                <strong>Spotify:</strong> Sincronización de lanzamientos y
                tracks de artistas del roster, y creación de playlists para
                usuarios que lo soliciten.
              </li>
              <li>
                <strong>Dropbox:</strong> Almacenamiento y gestión de archivos
                multimedia (fotos, audio, video).
              </li>
            </ul>
            <p className="mt-3">
              Cada una de estas plataformas tiene sus propias políticas de
              privacidad. Le recomendamos revisarlas antes de interactuar con
              dichas integraciones.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl uppercase mt-8 mb-3">
              4. Cookies
            </h2>
            <p>
              Utilizamos cookies para mejorar la experiencia de navegación,
              analizar el tráfico del sitio y permitir funcionalidades
              interactivas. Puede configurar su navegador para rechazar cookies,
              aunque esto podría afectar la funcionalidad del sitio.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl uppercase mt-8 mb-3">
              5. Compartir Información
            </h2>
            <p>
              No vendemos ni alquilamos su información personal. Compartimos
              información únicamente con:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>
                Proveedores de servicios que nos ayudan a operar el sitio
                (hosting, análisis, envío de correos).
              </li>
              <li>
                Plataformas de redes sociales según su consentimiento (al usar
                funciones de compartir o publicar).
              </li>
              <li>Autoridades competentes cuando sea requerido por ley.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-oswald text-xl uppercase mt-8 mb-3">
              6. Seguridad de Datos
            </h2>
            <p>
              Implementamos medidas de seguridad técnicas y organizativas para
              proteger su información, incluyendo encriptación de datos en
              tránsito (HTTPS), acceso restringido a información personal y
              monitoreo regular de nuestros sistemas.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl uppercase mt-8 mb-3">
              7. Derechos del Usuario
            </h2>
            <p>
              Usted tiene derecho a: acceder a sus datos personales, solicitar
              su corrección o eliminación, oponerse a su procesamiento y
              solicitar la portabilidad de sus datos. Para ejercer estos
              derechos, contáctenos en:
            </p>
            <p className="mt-2">
              <strong>Email:</strong> contacto@sonidoliquido.com
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl uppercase mt-8 mb-3">
              8. Cambios a esta Política
            </h2>
            <p>
              Podemos actualizar esta política periódicamente. Cualquier cambio
              significativo será notificado a través de nuestro sitio web. La
              fecha de última actualización se indica al inicio de este
              documento.
            </p>
          </section>

          <section>
            <h2 className="font-oswald text-xl uppercase mt-8 mb-3">
              9. Contacto
            </h2>
            <p>
              Para preguntas sobre esta política de privacidad, contáctenos en:
            </p>
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
