// ===========================================
// STYLE CONFIGURATION
// Available fonts, colors, presets, and animations for landing pages
// ===========================================

// Extended font options from Google Fonts
export const availableFonts = [
  // Display / Impact
  { value: "oswald", label: "Oswald", className: "font-oswald", preview: "TÍTULOS BOLD", category: "display" },
  { value: "bebas", label: "Bebas Neue", className: "font-bebas", preview: "IMPACTO", category: "display" },
  { value: "anton", label: "Anton", className: "font-anton", preview: "FUERTE", category: "display" },
  { value: "archivo-black", label: "Archivo Black", className: "font-archivo-black", preview: "MODERNO", category: "display" },
  { value: "righteous", label: "Righteous", className: "font-righteous", preview: "RETRO", category: "display" },
  { value: "black-ops-one", label: "Black Ops One", className: "font-black-ops", preview: "MILITAR", category: "display" },
  { value: "bangers", label: "Bangers", className: "font-bangers", preview: "COMIC", category: "display" },
  { value: "permanent-marker", label: "Permanent Marker", className: "font-marker", preview: "GRAFITI", category: "display" },

  // Sans Serif / Modern
  { value: "inter", label: "Inter", className: "font-sans", preview: "Moderno y limpio", category: "sans" },
  { value: "montserrat", label: "Montserrat", className: "font-montserrat", preview: "Elegante Sans", category: "sans" },
  { value: "poppins", label: "Poppins", className: "font-poppins", preview: "Geométrico", category: "sans" },
  { value: "raleway", label: "Raleway", className: "font-raleway", preview: "Fino y elegante", category: "sans" },
  { value: "space-grotesk", label: "Space Grotesk", className: "font-space", preview: "Futurista", category: "sans" },
  { value: "dm-sans", label: "DM Sans", className: "font-dm-sans", preview: "Neutral", category: "sans" },
  { value: "outfit", label: "Outfit", className: "font-outfit", preview: "Variable", category: "sans" },
  { value: "sora", label: "Sora", className: "font-sora", preview: "Tecnológico", category: "sans" },

  // Serif / Elegant
  { value: "playfair", label: "Playfair Display", className: "font-playfair", preview: "Elegante Serif", category: "serif" },
  { value: "libre-baskerville", label: "Libre Baskerville", className: "font-baskerville", preview: "Clásico", category: "serif" },
  { value: "cormorant", label: "Cormorant Garamond", className: "font-cormorant", preview: "Refinado", category: "serif" },
  { value: "cinzel", label: "Cinzel", className: "font-cinzel", preview: "ROMANO", category: "serif" },
  { value: "merriweather", label: "Merriweather", className: "font-merriweather", preview: "Legible", category: "serif" },

  // Monospace / Tech
  { value: "roboto-mono", label: "Roboto Mono", className: "font-mono", preview: "Código/Tech", category: "mono" },
  { value: "jetbrains-mono", label: "JetBrains Mono", className: "font-jetbrains", preview: "Developer", category: "mono" },
  { value: "fira-code", label: "Fira Code", className: "font-fira", preview: "Terminal", category: "mono" },
  { value: "source-code", label: "Source Code Pro", className: "font-source-code", preview: "Hacker", category: "mono" },

  // Script / Handwritten
  { value: "dancing-script", label: "Dancing Script", className: "font-dancing", preview: "Elegante cursiva", category: "script" },
  { value: "pacifico", label: "Pacifico", className: "font-pacifico", preview: "Surf vibes", category: "script" },
  { value: "caveat", label: "Caveat", className: "font-caveat", preview: "Manuscrito", category: "script" },
] as const;

export const fontCategories = [
  { value: "display", label: "Display / Impacto" },
  { value: "sans", label: "Sans Serif / Moderno" },
  { value: "serif", label: "Serif / Elegante" },
  { value: "mono", label: "Monospace / Tech" },
  { value: "script", label: "Script / Cursiva" },
] as const;

export const colorPresets = [
  { value: "orange", label: "Naranja (SLC)", primary: "#f97316", secondary: "#ea580c", accent: "#22c55e", bg: "from-orange-900/20" },
  { value: "gold", label: "Dorado", primary: "#eab308", secondary: "#ca8a04", accent: "#f97316", bg: "from-yellow-900/20" },
  { value: "red", label: "Rojo", primary: "#ef4444", secondary: "#dc2626", accent: "#f97316", bg: "from-red-900/20" },
  { value: "rose", label: "Rosa", primary: "#f43f5e", secondary: "#e11d48", accent: "#ec4899", bg: "from-rose-900/20" },
  { value: "pink", label: "Rosa Brillante", primary: "#ec4899", secondary: "#db2777", accent: "#f43f5e", bg: "from-pink-900/20" },
  { value: "purple", label: "Morado", primary: "#a855f7", secondary: "#9333ea", accent: "#ec4899", bg: "from-purple-900/20" },
  { value: "violet", label: "Violeta", primary: "#8b5cf6", secondary: "#7c3aed", accent: "#a855f7", bg: "from-violet-900/20" },
  { value: "indigo", label: "Índigo", primary: "#6366f1", secondary: "#4f46e5", accent: "#8b5cf6", bg: "from-indigo-900/20" },
  { value: "blue", label: "Azul", primary: "#3b82f6", secondary: "#2563eb", accent: "#06b6d4", bg: "from-blue-900/20" },
  { value: "cyan", label: "Cian", primary: "#06b6d4", secondary: "#0891b2", accent: "#3b82f6", bg: "from-cyan-900/20" },
  { value: "teal", label: "Teal", primary: "#14b8a6", secondary: "#0d9488", accent: "#22c55e", bg: "from-teal-900/20" },
  { value: "green", label: "Verde", primary: "#22c55e", secondary: "#16a34a", accent: "#14b8a6", bg: "from-green-900/20" },
  { value: "lime", label: "Lima", primary: "#84cc16", secondary: "#65a30d", accent: "#22c55e", bg: "from-lime-900/20" },
  { value: "spotify", label: "Spotify", primary: "#1db954", secondary: "#1ed760", accent: "#22c55e", bg: "from-green-900/20" },
  { value: "white", label: "Blanco", primary: "#ffffff", secondary: "#e5e7eb", accent: "#f97316", bg: "from-gray-800/20" },
  { value: "neon", label: "Neón", primary: "#00ff88", secondary: "#00ffcc", accent: "#ff00ff", bg: "from-green-900/20" },
  { value: "custom", label: "Personalizado", primary: "", secondary: "", accent: "", bg: "" },
] as const;

export const backgroundStyles = [
  { value: "gradient-dark", label: "Gradiente Oscuro", className: "bg-gradient-to-br from-slc-black via-slc-dark to-slc-black", mode: "dark" },
  { value: "gradient-radial", label: "Radial Centro", className: "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))]", mode: "dark" },
  { value: "gradient-top", label: "Radial Arriba", className: "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]", mode: "dark" },
  { value: "gradient-diagonal", label: "Diagonal", className: "bg-gradient-to-br", mode: "dark" },
  { value: "solid-black", label: "Negro Sólido", className: "bg-slc-black", mode: "dark" },
  { value: "solid-dark", label: "Gris Oscuro", className: "bg-slc-dark", mode: "dark" },
  { value: "noise", label: "Con Textura", className: "bg-slc-black", mode: "dark" },
  { value: "mesh", label: "Mesh Gradiente", className: "bg-slc-black", mode: "dark" },
  { value: "solid-light", label: "Blanco Sólido", className: "bg-white", mode: "light" },
  { value: "gradient-light", label: "Gradiente Claro", className: "bg-gradient-to-br from-gray-50 via-white to-gray-100", mode: "light" },
  { value: "gradient-soft", label: "Gradiente Suave", className: "bg-gradient-to-br from-gray-100 to-gray-200", mode: "light" },
  { value: "custom-image", label: "Imagen Personalizada", className: "bg-cover bg-center bg-no-repeat", mode: "both" },
] as const;

export const titleStyles = [
  { value: "uppercase", label: "MAYÚSCULAS", className: "uppercase tracking-tight" },
  { value: "capitalize", label: "Capitalizado", className: "capitalize" },
  { value: "normal", label: "Normal", className: "" },
  { value: "gradient", label: "Gradiente de Texto", className: "bg-gradient-to-r bg-clip-text text-transparent" },
  { value: "outlined", label: "Contorno", className: "text-transparent [-webkit-text-stroke:2px_currentColor]" },
  { value: "shadow", label: "Con Sombra", className: "drop-shadow-[0_0_25px_currentColor]" },
] as const;

// Animation presets for entrance effects
export const animationPresets = [
  {
    value: "none",
    label: "Sin Animación",
    description: "Los elementos aparecen inmediatamente",
    css: {}
  },
  {
    value: "fade-in",
    label: "Fade In",
    description: "Aparición suave con desvanecimiento",
    css: { animation: "fadeIn 0.6s ease-out forwards" }
  },
  {
    value: "fade-up",
    label: "Fade Up",
    description: "Desvanecimiento hacia arriba",
    css: { animation: "fadeUp 0.6s ease-out forwards" }
  },
  {
    value: "fade-down",
    label: "Fade Down",
    description: "Desvanecimiento hacia abajo",
    css: { animation: "fadeDown 0.6s ease-out forwards" }
  },
  {
    value: "slide-in-left",
    label: "Slide Left",
    description: "Deslizar desde la izquierda",
    css: { animation: "slideInLeft 0.5s ease-out forwards" }
  },
  {
    value: "slide-in-right",
    label: "Slide Right",
    description: "Deslizar desde la derecha",
    css: { animation: "slideInRight 0.5s ease-out forwards" }
  },
  {
    value: "scale-in",
    label: "Scale In",
    description: "Aparecer creciendo desde el centro",
    css: { animation: "scaleIn 0.5s ease-out forwards" }
  },
  {
    value: "bounce-in",
    label: "Bounce In",
    description: "Aparecer con rebote",
    css: { animation: "bounceIn 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards" }
  },
  {
    value: "rotate-in",
    label: "Rotate In",
    description: "Aparecer con rotación",
    css: { animation: "rotateIn 0.6s ease-out forwards" }
  },
  {
    value: "blur-in",
    label: "Blur In",
    description: "Aparecer desde desenfocado",
    css: { animation: "blurIn 0.6s ease-out forwards" }
  },
  {
    value: "flip-in",
    label: "Flip In",
    description: "Voltear en 3D",
    css: { animation: "flipIn 0.6s ease-out forwards" }
  },
  {
    value: "stagger",
    label: "Stagger (Cascada)",
    description: "Los elementos aparecen en secuencia",
    css: { animation: "fadeUp 0.5s ease-out forwards" },
    stagger: true
  },
] as const;

// Style presets for quick application
export const stylePresets = [
  {
    id: "slc-classic",
    name: "SLC Clásico",
    description: "El estilo clásico de Sonido Líquido Crew",
    preview: "/presets/slc-classic.png",
    settings: {
      colorPreset: "orange",
      primaryColor: "#f97316",
      secondaryColor: "#ea580c",
      accentColor: "#22c55e",
      textColor: "#ffffff",
      titleFont: "oswald",
      bodyFont: "inter",
      titleStyle: "uppercase",
      backgroundStyle: "gradient-dark",
      buttonStyle: "gradient" as const,
      buttonRounded: "lg" as const,
      enableGlow: true,
      enableAnimations: true,
      animationPreset: "fade-up",
    }
  },
  {
    id: "neon-nights",
    name: "Neon Nights",
    description: "Estilo futurista con neones brillantes",
    preview: "/presets/neon-nights.png",
    settings: {
      colorPreset: "neon",
      primaryColor: "#00ff88",
      secondaryColor: "#00ffcc",
      accentColor: "#ff00ff",
      textColor: "#ffffff",
      titleFont: "space-grotesk",
      bodyFont: "dm-sans",
      titleStyle: "shadow",
      backgroundStyle: "solid-black",
      buttonStyle: "outline" as const,
      buttonRounded: "none" as const,
      enableGlow: true,
      enableAnimations: true,
      animationPreset: "blur-in",
    }
  },
  {
    id: "minimal-dark",
    name: "Minimal Dark",
    description: "Minimalismo oscuro y elegante",
    preview: "/presets/minimal-dark.png",
    settings: {
      colorPreset: "white",
      primaryColor: "#ffffff",
      secondaryColor: "#e5e7eb",
      accentColor: "#f97316",
      textColor: "#ffffff",
      titleFont: "inter",
      bodyFont: "inter",
      titleStyle: "normal",
      backgroundStyle: "solid-black",
      buttonStyle: "outline" as const,
      buttonRounded: "none" as const,
      enableGlow: false,
      enableAnimations: true,
      animationPreset: "fade-in",
    }
  },
  {
    id: "spotify-vibes",
    name: "Spotify Vibes",
    description: "Inspirado en el estilo de Spotify",
    preview: "/presets/spotify-vibes.png",
    settings: {
      colorPreset: "spotify",
      primaryColor: "#1db954",
      secondaryColor: "#1ed760",
      accentColor: "#22c55e",
      textColor: "#ffffff",
      titleFont: "montserrat",
      bodyFont: "montserrat",
      titleStyle: "uppercase",
      backgroundStyle: "gradient-radial",
      buttonStyle: "solid" as const,
      buttonRounded: "full" as const,
      enableGlow: true,
      enableAnimations: true,
      animationPreset: "scale-in",
    }
  },
  {
    id: "purple-haze",
    name: "Purple Haze",
    description: "Tonos morados psicodélicos",
    preview: "/presets/purple-haze.png",
    settings: {
      colorPreset: "purple",
      primaryColor: "#a855f7",
      secondaryColor: "#9333ea",
      accentColor: "#ec4899",
      textColor: "#ffffff",
      titleFont: "bebas",
      bodyFont: "poppins",
      titleStyle: "gradient",
      backgroundStyle: "gradient-radial",
      buttonStyle: "gradient" as const,
      buttonRounded: "lg" as const,
      enableGlow: true,
      enableAnimations: true,
      animationPreset: "fade-up",
    }
  },
  {
    id: "elegant-serif",
    name: "Elegante Clásico",
    description: "Estilo editorial con serif elegante",
    preview: "/presets/elegant-serif.png",
    settings: {
      colorPreset: "gold",
      primaryColor: "#eab308",
      secondaryColor: "#ca8a04",
      accentColor: "#f97316",
      textColor: "#ffffff",
      titleFont: "playfair",
      bodyFont: "libre-baskerville",
      titleStyle: "capitalize",
      backgroundStyle: "solid-dark",
      buttonStyle: "outline" as const,
      buttonRounded: "none" as const,
      enableGlow: false,
      enableAnimations: true,
      animationPreset: "fade-in",
    }
  },
  {
    id: "street-graffiti",
    name: "Street Graffiti",
    description: "Estilo urbano con toque de grafiti",
    preview: "/presets/street-graffiti.png",
    settings: {
      colorPreset: "red",
      primaryColor: "#ef4444",
      secondaryColor: "#dc2626",
      accentColor: "#eab308",
      textColor: "#ffffff",
      titleFont: "permanent-marker",
      bodyFont: "inter",
      titleStyle: "normal",
      backgroundStyle: "noise",
      buttonStyle: "solid" as const,
      buttonRounded: "md" as const,
      enableGlow: false,
      enableAnimations: true,
      animationPreset: "bounce-in",
    }
  },
  {
    id: "cyber-tech",
    name: "Cyber Tech",
    description: "Futurista estilo cyberpunk",
    preview: "/presets/cyber-tech.png",
    settings: {
      colorPreset: "cyan",
      primaryColor: "#06b6d4",
      secondaryColor: "#0891b2",
      accentColor: "#f43f5e",
      textColor: "#ffffff",
      titleFont: "jetbrains-mono",
      bodyFont: "fira-code",
      titleStyle: "uppercase",
      backgroundStyle: "mesh",
      buttonStyle: "glass" as const,
      buttonRounded: "sm" as const,
      enableGlow: true,
      enableAnimations: true,
      animationPreset: "slide-in-left",
    }
  },
] as const;

export interface StyleSettings {
  // Colors
  colorPreset: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;

  // Typography
  titleFont: string;
  bodyFont: string;
  titleStyle: string;

  // Background
  backgroundStyle: string;
  backgroundImageUrl?: string;
  backgroundOverlayOpacity: number;
  backgroundBlur: number;

  // Effects
  enableGlow: boolean;
  enableAnimations: boolean;
  enableParticles: boolean;
  animationPreset: string;

  // Button style
  buttonStyle: "solid" | "gradient" | "outline" | "glass";
  buttonRounded: "none" | "sm" | "md" | "lg" | "full";

  // Theme mode
  darkMode: boolean;
}

export const defaultStyleSettings: StyleSettings = {
  colorPreset: "orange",
  primaryColor: "#f97316",
  secondaryColor: "#ea580c",
  accentColor: "#22c55e",
  textColor: "#ffffff",
  titleFont: "oswald",
  bodyFont: "inter",
  titleStyle: "uppercase",
  backgroundStyle: "gradient-dark",
  backgroundOverlayOpacity: 50,
  backgroundBlur: 0,
  enableGlow: true,
  enableAnimations: true,
  enableParticles: false,
  animationPreset: "fade-up",
  buttonStyle: "gradient",
  buttonRounded: "lg",
  darkMode: true,
};

// Light mode color overrides
export const lightModeOverrides: Partial<StyleSettings> = {
  textColor: "#1a1a1a",
  backgroundStyle: "solid-light",
};

// Responsive preview breakpoints
export const responsiveBreakpoints = {
  mobile: { width: 375, height: 667, label: "Mobile", icon: "Smartphone" },
  tablet: { width: 768, height: 1024, label: "Tablet", icon: "Tablet" },
  desktop: { width: 1280, height: 800, label: "Desktop", icon: "Monitor" },
} as const;

export type ResponsiveBreakpoint = keyof typeof responsiveBreakpoints;

// Helper to get CSS variables from settings
export function getStyleVariables(settings: Partial<StyleSettings>): Record<string, string> {
  const merged = { ...defaultStyleSettings, ...settings };

  // Find preset colors if using a preset
  const preset = colorPresets.find(p => p.value === merged.colorPreset);
  const primary = merged.primaryColor || preset?.primary || defaultStyleSettings.primaryColor;
  const secondary = merged.secondaryColor || preset?.secondary || defaultStyleSettings.secondaryColor;
  const accent = merged.accentColor || preset?.accent || defaultStyleSettings.accentColor;

  return {
    "--style-primary": primary,
    "--style-secondary": secondary,
    "--style-accent": accent,
    "--style-text": merged.textColor,
    "--style-overlay-opacity": `${merged.backgroundOverlayOpacity / 100}`,
    "--style-bg-blur": `${merged.backgroundBlur}px`,
  };
}

// Helper to get font class
export function getFontClass(fontValue: string): string {
  const font = availableFonts.find(f => f.value === fontValue);
  return font?.className || "font-sans";
}

// Helper to generate button classes
export function getButtonClasses(settings: Partial<StyleSettings>): string {
  const merged = { ...defaultStyleSettings, ...settings };

  const roundedMap = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full",
  };

  const styleMap = {
    solid: "bg-[var(--style-primary)] hover:bg-[var(--style-secondary)]",
    gradient: "bg-gradient-to-r from-[var(--style-primary)] to-[var(--style-secondary)] hover:opacity-90",
    outline: "border-2 border-[var(--style-primary)] hover:bg-[var(--style-primary)]/10",
    glass: "bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/20",
  };

  return `${roundedMap[merged.buttonRounded]} ${styleMap[merged.buttonStyle]}`;
}

// Animation CSS keyframes (to be injected into the page)
export const animationKeyframes = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes fadeDown {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-50px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(50px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.8); }
    to { opacity: 1; transform: scale(1); }
  }

  @keyframes bounceIn {
    0% { opacity: 0; transform: scale(0.3); }
    50% { transform: scale(1.05); }
    70% { transform: scale(0.9); }
    100% { opacity: 1; transform: scale(1); }
  }

  @keyframes rotateIn {
    from { opacity: 0; transform: rotate(-10deg) scale(0.9); }
    to { opacity: 1; transform: rotate(0) scale(1); }
  }

  @keyframes blurIn {
    from { opacity: 0; filter: blur(10px); }
    to { opacity: 1; filter: blur(0); }
  }

  @keyframes flipIn {
    from { opacity: 0; transform: perspective(400px) rotateX(-90deg); }
    to { opacity: 1; transform: perspective(400px) rotateX(0); }
  }
`;

// Helper to get animation style for an element
export function getAnimationStyle(preset: string, delay: number = 0): React.CSSProperties {
  const animation = animationPresets.find(a => a.value === preset);
  if (!animation || preset === "none") return {};

  return {
    ...animation.css,
    animationDelay: delay > 0 ? `${delay}ms` : undefined,
    opacity: 0, // Start invisible for animations
  };
}

// Helper to generate Google Fonts URL
export function getGoogleFontsUrl(fonts: string[]): string {
  const fontFamilies = fonts.map(f => {
    const font = availableFonts.find(af => af.value === f);
    if (!font) return null;

    // Map font values to Google Fonts family names
    const fontMap: Record<string, string> = {
      "oswald": "Oswald:wght@400;500;600;700",
      "bebas": "Bebas+Neue",
      "anton": "Anton",
      "archivo-black": "Archivo+Black",
      "righteous": "Righteous",
      "black-ops-one": "Black+Ops+One",
      "bangers": "Bangers",
      "permanent-marker": "Permanent+Marker",
      "inter": "Inter:wght@400;500;600;700",
      "montserrat": "Montserrat:wght@400;500;600;700",
      "poppins": "Poppins:wght@400;500;600;700",
      "raleway": "Raleway:wght@400;500;600;700",
      "space-grotesk": "Space+Grotesk:wght@400;500;600;700",
      "dm-sans": "DM+Sans:wght@400;500;600;700",
      "outfit": "Outfit:wght@400;500;600;700",
      "sora": "Sora:wght@400;500;600;700",
      "playfair": "Playfair+Display:wght@400;500;600;700",
      "libre-baskerville": "Libre+Baskerville:wght@400;700",
      "cormorant": "Cormorant+Garamond:wght@400;500;600;700",
      "cinzel": "Cinzel:wght@400;500;600;700",
      "merriweather": "Merriweather:wght@400;700",
      "roboto-mono": "Roboto+Mono:wght@400;500;600;700",
      "jetbrains-mono": "JetBrains+Mono:wght@400;500;600;700",
      "fira-code": "Fira+Code:wght@400;500;600;700",
      "source-code": "Source+Code+Pro:wght@400;500;600;700",
      "dancing-script": "Dancing+Script:wght@400;500;600;700",
      "pacifico": "Pacifico",
      "caveat": "Caveat:wght@400;500;600;700",
    };

    return fontMap[f];
  }).filter(Boolean);

  if (fontFamilies.length === 0) return "";

  return `https://fonts.googleapis.com/css2?${fontFamilies.map(f => `family=${f}`).join("&")}&display=swap`;
}
