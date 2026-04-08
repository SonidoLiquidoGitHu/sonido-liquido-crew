import Link from "next/link";

const socialLinks = [
  {
    name: "Spotify",
    href: "https://open.spotify.com/playlist/5qHTKCZIwi3GM3mhPq45Ab",
    icon: (
      <path
        fill="currentColor"
        d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
      />
    ),
    color: "hover:text-spotify",
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/@sonidoliquidocrew",
    icon: (
      <path
        fill="currentColor"
        d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
      />
    ),
    color: "hover:text-youtube",
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/sonidoliquido/",
    icon: (
      <path
        fill="currentColor"
        d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"
      />
    ),
    color: "hover:text-instagram",
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/sonidoliquidocrew/",
    icon: (
      <path
        fill="currentColor"
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    ),
    color: "hover:text-blue-500",
  },
];

const footerLinks: {
  navigation: Array<{ label: string; href: string }>;
  legal: Array<{ label: string; href: string; isAdmin?: boolean }>;
} = {
  navigation: [
    { label: "Inicio", href: "/" },
    { label: "Artistas", href: "/artistas" },
    { label: "Discografía", href: "/discografia" },
    { label: "Videos", href: "/videos" },
    { label: "Eventos", href: "/eventos" },
    { label: "Tienda", href: "/tienda" },
  ],
  legal: [
    { label: "Nosotros", href: "/nosotros" },
    { label: "Contacto", href: "/contacto" },
    { label: "Prensa", href: "/prensa" },
    { label: "Newsletter", href: "/newsletter" },
    { label: "Admin", href: "/admin", isAdmin: true },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-slc-border bg-slc-darker">
      <div className="section-container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-slc-card border border-slc-border flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                  <circle cx="12" cy="12" r="3" fill="currentColor" />
                </svg>
              </div>
              <div>
                <h2 className="font-oswald text-lg uppercase tracking-wider">
                  Sonido Líquido
                </h2>
                <p className="text-xs text-primary uppercase tracking-widest">
                  Hip Hop México
                </p>
              </div>
            </div>
            <p className="text-slc-muted text-sm max-w-md mb-6">
              El colectivo de Hip Hop más representativo de México.
              Fundado en 1999 en la Ciudad de México.
              +160 lanzamientos, +25 años de historia.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-10 h-10 flex items-center justify-center rounded-full bg-slc-card border border-slc-border text-slc-muted transition-all ${social.color} hover:border-current`}
                  aria-label={social.name}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    {social.icon}
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h3 className="font-oswald text-sm uppercase tracking-wider mb-4">
              Navegación
            </h3>
            <ul className="space-y-2">
              {footerLinks.navigation.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-slc-muted hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* More Links */}
          <div>
            <h3 className="font-oswald text-sm uppercase tracking-wider mb-4">
              Más
            </h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`text-slc-muted hover:text-white transition-colors text-sm inline-flex items-center gap-1.5 ${
                      link.isAdmin ? "hover:text-primary" : ""
                    }`}
                  >
                    {link.isAdmin && (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )}
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slc-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slc-muted text-sm">
            © {new Date().getFullYear()} Sonido Líquido Crew. Todos los derechos reservados.
          </p>
          <p className="text-slc-muted text-xs">
            Lo más avanzado del Hip Hop mexicano desde 1999
          </p>
        </div>
      </div>
    </footer>
  );
}
