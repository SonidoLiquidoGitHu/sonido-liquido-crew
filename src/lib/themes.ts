// ===========================================
// MUSIC COLLECTIVE THEMES
// Different visual styles for various music genres/collectives
// ===========================================

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  card: string;
  border: string;
  text: string;
  muted: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  genre: string;
  colors: ThemeColors;
  fonts: {
    heading: string;
    body: string;
  };
  style: {
    borderRadius: "none" | "sm" | "md" | "lg" | "full";
    buttonStyle: "solid" | "outline" | "gradient";
    cardStyle: "flat" | "elevated" | "glass";
    animations: boolean;
  };
  preview: {
    gradient: string;
    pattern?: string;
  };
}

// Additional themes added for variety
export const THEMES: ThemeConfig[] = [
  {
    id: "hip-hop-classic",
    name: "Hip Hop Clásico",
    description: "Estilo urbano con naranja intenso y negro profundo. Perfecto para colectivos de hip hop.",
    genre: "Hip Hop",
    colors: {
      primary: "#f97316",
      secondary: "#ea580c",
      accent: "#fb923c",
      background: "#0a0a0a",
      card: "#1a1a1a",
      border: "#2a2a2a",
      text: "#ffffff",
      muted: "#888888",
    },
    fonts: {
      heading: "Oswald",
      body: "Inter",
    },
    style: {
      borderRadius: "lg",
      buttonStyle: "solid",
      cardStyle: "flat",
      animations: true,
    },
    preview: {
      gradient: "linear-gradient(135deg, #f97316 0%, #0a0a0a 100%)",
    },
  },
  {
    id: "trap-neon",
    name: "Trap Neón",
    description: "Colores neón vibrantes sobre negro. Ideal para trap y música urbana moderna.",
    genre: "Trap / Urban",
    colors: {
      primary: "#a855f7",
      secondary: "#7c3aed",
      accent: "#06b6d4",
      background: "#0f0f0f",
      card: "#1a1a2e",
      border: "#2a2a4a",
      text: "#ffffff",
      muted: "#9ca3af",
    },
    fonts: {
      heading: "Bebas Neue",
      body: "Roboto",
    },
    style: {
      borderRadius: "md",
      buttonStyle: "gradient",
      cardStyle: "glass",
      animations: true,
    },
    preview: {
      gradient: "linear-gradient(135deg, #a855f7 0%, #06b6d4 50%, #0f0f0f 100%)",
    },
  },
  {
    id: "reggaeton-gold",
    name: "Reggaetón Dorado",
    description: "Oro y negro lujoso. Para artistas de reggaetón y música latina.",
    genre: "Reggaetón / Latin",
    colors: {
      primary: "#eab308",
      secondary: "#ca8a04",
      accent: "#fbbf24",
      background: "#0c0a09",
      card: "#1c1917",
      border: "#292524",
      text: "#ffffff",
      muted: "#a8a29e",
    },
    fonts: {
      heading: "Montserrat",
      body: "Open Sans",
    },
    style: {
      borderRadius: "lg",
      buttonStyle: "gradient",
      cardStyle: "elevated",
      animations: true,
    },
    preview: {
      gradient: "linear-gradient(135deg, #eab308 0%, #0c0a09 100%)",
    },
  },
  {
    id: "rock-metal",
    name: "Rock / Metal",
    description: "Rojo sangre y negro. Para bandas de rock, metal y punk.",
    genre: "Rock / Metal",
    colors: {
      primary: "#dc2626",
      secondary: "#b91c1c",
      accent: "#ef4444",
      background: "#0a0a0a",
      card: "#171717",
      border: "#262626",
      text: "#fafafa",
      muted: "#737373",
    },
    fonts: {
      heading: "Anton",
      body: "Roboto Condensed",
    },
    style: {
      borderRadius: "none",
      buttonStyle: "solid",
      cardStyle: "flat",
      animations: false,
    },
    preview: {
      gradient: "linear-gradient(135deg, #dc2626 0%, #0a0a0a 100%)",
    },
  },
  {
    id: "electronic-cyber",
    name: "Electrónica Cyber",
    description: "Azul eléctrico futurista. Para DJs, productores y música electrónica.",
    genre: "Electrónica / EDM",
    colors: {
      primary: "#3b82f6",
      secondary: "#2563eb",
      accent: "#06b6d4",
      background: "#030712",
      card: "#0f172a",
      border: "#1e293b",
      text: "#f8fafc",
      muted: "#94a3b8",
    },
    fonts: {
      heading: "Orbitron",
      body: "Rajdhani",
    },
    style: {
      borderRadius: "md",
      buttonStyle: "outline",
      cardStyle: "glass",
      animations: true,
    },
    preview: {
      gradient: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 50%, #030712 100%)",
    },
  },
  {
    id: "indie-minimal",
    name: "Indie Minimal",
    description: "Diseño limpio y minimalista. Para artistas indie y alternativos.",
    genre: "Indie / Alternative",
    colors: {
      primary: "#10b981",
      secondary: "#059669",
      accent: "#34d399",
      background: "#fafafa",
      card: "#ffffff",
      border: "#e5e5e5",
      text: "#171717",
      muted: "#737373",
    },
    fonts: {
      heading: "Playfair Display",
      body: "Lora",
    },
    style: {
      borderRadius: "sm",
      buttonStyle: "outline",
      cardStyle: "elevated",
      animations: false,
    },
    preview: {
      gradient: "linear-gradient(135deg, #10b981 0%, #fafafa 100%)",
    },
  },
  {
    id: "jazz-soul",
    name: "Jazz & Soul",
    description: "Tonos cálidos y elegantes. Para jazz, soul, R&B y música clásica.",
    genre: "Jazz / Soul / R&B",
    colors: {
      primary: "#d97706",
      secondary: "#b45309",
      accent: "#f59e0b",
      background: "#1c1917",
      card: "#292524",
      border: "#44403c",
      text: "#fafaf9",
      muted: "#a8a29e",
    },
    fonts: {
      heading: "Cormorant Garamond",
      body: "Source Sans Pro",
    },
    style: {
      borderRadius: "lg",
      buttonStyle: "solid",
      cardStyle: "elevated",
      animations: true,
    },
    preview: {
      gradient: "linear-gradient(135deg, #d97706 0%, #1c1917 100%)",
    },
  },
  {
    id: "reggae-roots",
    name: "Reggae Roots",
    description: "Colores rastafari clásicos. Para reggae, dub y música jamaicana.",
    genre: "Reggae / Dub",
    colors: {
      primary: "#16a34a",
      secondary: "#eab308",
      accent: "#dc2626",
      background: "#0f0f0f",
      card: "#1a1a1a",
      border: "#2a2a2a",
      text: "#ffffff",
      muted: "#9ca3af",
    },
    fonts: {
      heading: "Righteous",
      body: "Nunito",
    },
    style: {
      borderRadius: "lg",
      buttonStyle: "solid",
      cardStyle: "flat",
      animations: true,
    },
    preview: {
      gradient: "linear-gradient(135deg, #16a34a 0%, #eab308 50%, #dc2626 100%)",
    },
  },
  {
    id: "k-pop-pastel",
    name: "K-Pop Pastel",
    description: "Colores pastel vibrantes. Para K-pop, J-pop y música asiática.",
    genre: "K-Pop / J-Pop",
    colors: {
      primary: "#ec4899",
      secondary: "#a855f7",
      accent: "#06b6d4",
      background: "#fdf4ff",
      card: "#ffffff",
      border: "#f5d0fe",
      text: "#1e1b4b",
      muted: "#6b7280",
    },
    fonts: {
      heading: "Poppins",
      body: "Quicksand",
    },
    style: {
      borderRadius: "full",
      buttonStyle: "gradient",
      cardStyle: "elevated",
      animations: true,
    },
    preview: {
      gradient: "linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #06b6d4 100%)",
    },
  },
  {
    id: "latin-tropical",
    name: "Latino Tropical",
    description: "Colores tropicales vibrantes. Para salsa, cumbia y música tropical.",
    genre: "Salsa / Cumbia / Tropical",
    colors: {
      primary: "#f97316",
      secondary: "#ec4899",
      accent: "#22c55e",
      background: "#0f172a",
      card: "#1e293b",
      border: "#334155",
      text: "#f8fafc",
      muted: "#94a3b8",
    },
    fonts: {
      heading: "Passion One",
      body: "Cabin",
    },
    style: {
      borderRadius: "lg",
      buttonStyle: "gradient",
      cardStyle: "glass",
      animations: true,
    },
    preview: {
      gradient: "linear-gradient(135deg, #f97316 0%, #ec4899 50%, #22c55e 100%)",
    },
  },
  {
    id: "afrobeat-sunset",
    name: "Afrobeat Sunset",
    description: "Tonos cálidos africanos. Para afrobeat, highlife y música africana.",
    genre: "Afrobeat / Highlife",
    colors: {
      primary: "#f59e0b",
      secondary: "#dc2626",
      accent: "#84cc16",
      background: "#1c1917",
      card: "#292524",
      border: "#44403c",
      text: "#fafaf9",
      muted: "#a8a29e",
    },
    fonts: {
      heading: "Archivo Black",
      body: "Nunito Sans",
    },
    style: {
      borderRadius: "lg",
      buttonStyle: "solid",
      cardStyle: "elevated",
      animations: true,
    },
    preview: {
      gradient: "linear-gradient(135deg, #f59e0b 0%, #dc2626 50%, #84cc16 100%)",
    },
  },
  {
    id: "synthwave-retro",
    name: "Synthwave Retro",
    description: "Estética retro 80s. Para synthwave, vaporwave y música retro.",
    genre: "Synthwave / Vaporwave",
    colors: {
      primary: "#ff00ff",
      secondary: "#00ffff",
      accent: "#ff6b6b",
      background: "#1a0a2e",
      card: "#2d1b4e",
      border: "#4a2c7a",
      text: "#ffffff",
      muted: "#b794f4",
    },
    fonts: {
      heading: "Audiowide",
      body: "Share Tech Mono",
    },
    style: {
      borderRadius: "none",
      buttonStyle: "gradient",
      cardStyle: "glass",
      animations: true,
    },
    preview: {
      gradient: "linear-gradient(135deg, #ff00ff 0%, #00ffff 50%, #1a0a2e 100%)",
    },
  },
  {
    id: "country-western",
    name: "Country Western",
    description: "Tonos tierra y madera. Para country, folk y música americana.",
    genre: "Country / Folk",
    colors: {
      primary: "#b45309",
      secondary: "#78350f",
      accent: "#fbbf24",
      background: "#fef3c7",
      card: "#fef9e7",
      border: "#d97706",
      text: "#451a03",
      muted: "#92400e",
    },
    fonts: {
      heading: "Rye",
      body: "Lato",
    },
    style: {
      borderRadius: "sm",
      buttonStyle: "solid",
      cardStyle: "elevated",
      animations: false,
    },
    preview: {
      gradient: "linear-gradient(135deg, #b45309 0%, #fef3c7 100%)",
    },
  },
  {
    id: "punk-grunge",
    name: "Punk Grunge",
    description: "Estética cruda y rebelde. Para punk, grunge y hardcore.",
    genre: "Punk / Grunge",
    colors: {
      primary: "#facc15",
      secondary: "#000000",
      accent: "#ef4444",
      background: "#0a0a0a",
      card: "#171717",
      border: "#404040",
      text: "#f5f5f5",
      muted: "#737373",
    },
    fonts: {
      heading: "Permanent Marker",
      body: "Barlow",
    },
    style: {
      borderRadius: "none",
      buttonStyle: "solid",
      cardStyle: "flat",
      animations: false,
    },
    preview: {
      gradient: "linear-gradient(135deg, #facc15 0%, #000000 50%, #ef4444 100%)",
    },
  },
  {
    id: "lofi-chill",
    name: "Lo-Fi Chill",
    description: "Colores suaves y relajantes. Para lo-fi, chillhop y ambient.",
    genre: "Lo-Fi / Chillhop",
    colors: {
      primary: "#a78bfa",
      secondary: "#7c3aed",
      accent: "#f9a8d4",
      background: "#1e1b4b",
      card: "#2e2a5e",
      border: "#4338ca",
      text: "#e9d5ff",
      muted: "#a5b4fc",
    },
    fonts: {
      heading: "Comfortaa",
      body: "Space Grotesk",
    },
    style: {
      borderRadius: "lg",
      buttonStyle: "outline",
      cardStyle: "glass",
      animations: true,
    },
    preview: {
      gradient: "linear-gradient(135deg, #a78bfa 0%, #f9a8d4 50%, #1e1b4b 100%)",
    },
  },
  {
    id: "flamenco-spanish",
    name: "Flamenco Español",
    description: "Rojo pasión y negro intenso. Para flamenco y música española.",
    genre: "Flamenco / Spanish",
    colors: {
      primary: "#dc2626",
      secondary: "#fbbf24",
      accent: "#000000",
      background: "#1c1917",
      card: "#292524",
      border: "#57534e",
      text: "#fafaf9",
      muted: "#a8a29e",
    },
    fonts: {
      heading: "Cinzel",
      body: "Lora",
    },
    style: {
      borderRadius: "sm",
      buttonStyle: "solid",
      cardStyle: "elevated",
      animations: true,
    },
    preview: {
      gradient: "linear-gradient(135deg, #dc2626 0%, #fbbf24 50%, #1c1917 100%)",
    },
  },
  {
    id: "gospel-spiritual",
    name: "Gospel Espiritual",
    description: "Dorados y blancos divinos. Para gospel, música cristiana y espiritual.",
    genre: "Gospel / Espiritual",
    colors: {
      primary: "#d4af37",
      secondary: "#8b7355",
      accent: "#f5f5dc",
      background: "#ffffff",
      card: "#fafafa",
      border: "#e5e5e5",
      text: "#1f2937",
      muted: "#6b7280",
    },
    fonts: {
      heading: "Cormorant",
      body: "Source Serif Pro",
    },
    style: {
      borderRadius: "lg",
      buttonStyle: "outline",
      cardStyle: "elevated",
      animations: true,
    },
    preview: {
      gradient: "linear-gradient(135deg, #d4af37 0%, #ffffff 100%)",
    },
  },
];

// Get a theme by ID
export function getThemeById(id: string): ThemeConfig | undefined {
  return THEMES.find((theme) => theme.id === id);
}

// Generate CSS variables from a theme
export function generateThemeCSS(theme: ThemeConfig): string {
  return `
:root {
  --primary: ${theme.colors.primary};
  --secondary: ${theme.colors.secondary};
  --accent: ${theme.colors.accent};
  --background: ${theme.colors.background};
  --card: ${theme.colors.card};
  --border: ${theme.colors.border};
  --text: ${theme.colors.text};
  --muted: ${theme.colors.muted};

  --font-heading: '${theme.fonts.heading}', sans-serif;
  --font-body: '${theme.fonts.body}', sans-serif;

  --radius: ${
    theme.style.borderRadius === "none" ? "0" :
    theme.style.borderRadius === "sm" ? "0.25rem" :
    theme.style.borderRadius === "md" ? "0.5rem" :
    theme.style.borderRadius === "lg" ? "1rem" :
    "9999px"
  };
}
`;
}

// Generate Tailwind config from a theme
export function generateTailwindConfig(theme: ThemeConfig): string {
  return `// tailwind.config.ts theme extension
theme: {
  extend: {
    colors: {
      primary: '${theme.colors.primary}',
      secondary: '${theme.colors.secondary}',
      accent: '${theme.colors.accent}',
      background: '${theme.colors.background}',
      card: '${theme.colors.card}',
      border: '${theme.colors.border}',
      foreground: '${theme.colors.text}',
      muted: '${theme.colors.muted}',
    },
    fontFamily: {
      heading: ['${theme.fonts.heading}', 'sans-serif'],
      body: ['${theme.fonts.body}', 'sans-serif'],
    },
    borderRadius: {
      DEFAULT: '${
        theme.style.borderRadius === "none" ? "0" :
        theme.style.borderRadius === "sm" ? "0.25rem" :
        theme.style.borderRadius === "md" ? "0.5rem" :
        theme.style.borderRadius === "lg" ? "1rem" :
        "9999px"
      }',
    },
  },
}`;
}

export default THEMES;
