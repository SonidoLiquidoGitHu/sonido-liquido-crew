-- Press Kit Table
CREATE TABLE IF NOT EXISTS press_kit (
  id TEXT PRIMARY KEY DEFAULT 'main',

  -- Hero Section
  hero_title TEXT DEFAULT 'Sonido Líquido Crew',
  hero_subtitle TEXT DEFAULT 'El colectivo de Hip Hop más representativo de México',
  hero_tagline TEXT DEFAULT 'Fundado en 1999 en la Ciudad de México por Zaque.',
  hero_cover_image_url TEXT,
  hero_banner_image_url TEXT,

  -- Stats
  stats_artists TEXT DEFAULT '20+',
  stats_releases TEXT DEFAULT '160+',
  stats_years TEXT DEFAULT '25+',

  -- About Section
  about_title TEXT DEFAULT 'Sobre Nosotros',
  about_content TEXT,

  -- Key Points (JSON)
  key_points TEXT,

  -- Contact Info
  contact_email TEXT DEFAULT 'prensasonidoliquido@gmail.com',
  contact_phone TEXT DEFAULT '+52 55 2801 1881',
  contact_location TEXT DEFAULT 'Ciudad de México, CDMX',

  -- Social Links
  spotify_url TEXT DEFAULT 'https://open.spotify.com/playlist/5qHTKCZIwi3GM3mhPq45Ab',
  instagram_url TEXT DEFAULT 'https://www.instagram.com/sonidoliquido/',
  youtube_url TEXT DEFAULT 'https://www.youtube.com/@sonidoliquidocrew',
  twitter_url TEXT,
  facebook_url TEXT,

  -- Downloads (JSON)
  downloads TEXT,

  -- Media Gallery (JSON)
  media_gallery TEXT,

  -- Press Quotes (JSON)
  press_quotes TEXT,

  -- Featured Video
  featured_video_url TEXT,
  featured_video_title TEXT,

  -- Footer CTA
  footer_cta_title TEXT DEFAULT '¿Listo para colaborar?',
  footer_cta_button_text TEXT DEFAULT 'Enviar Mensaje',

  -- SEO
  meta_title TEXT DEFAULT 'Press Kit | Sonido Líquido Crew',
  meta_description TEXT DEFAULT 'Kit de prensa oficial de Sonido Líquido Crew. Información, biografías, fotos y recursos para medios.',

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Insert default record
INSERT OR IGNORE INTO press_kit (id) VALUES ('main');
