"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getThemeById, type ThemeConfig, type ThemeColors } from "@/lib/themes";

interface ThemeSettings {
  themeId: string;
  customColors: Partial<ThemeColors> | null;
  customFonts: { heading?: string; body?: string } | null;
  customStyle: Partial<ThemeConfig["style"]> | null;
  isCustom: boolean;
}

interface ThemeContextValue {
  theme: ThemeConfig | null;
  themeSettings: ThemeSettings | null;
  isLoading: boolean;
  applyTheme: (themeId: string) => void;
  applyCustomColors: (colors: Partial<ThemeColors>) => void;
  previewTheme: (themeId: string) => void;
  resetPreview: () => void;
  isPreview: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

function applyThemeToDocument(theme: ThemeConfig, customColors?: Partial<ThemeColors> | null) {
  const root = document.documentElement;
  const colors = { ...theme.colors, ...(customColors || {}) };

  // Apply CSS variables
  root.style.setProperty("--slc-primary", colors.primary);
  root.style.setProperty("--slc-secondary", colors.secondary);
  root.style.setProperty("--slc-accent", colors.accent);
  root.style.setProperty("--slc-background", colors.background);
  root.style.setProperty("--slc-card", colors.card);
  root.style.setProperty("--slc-border", colors.border);
  root.style.setProperty("--slc-text", colors.text);
  root.style.setProperty("--slc-muted", colors.muted);

  // Apply shadcn theme colors for compatibility
  root.style.setProperty("--background", hexToHSL(colors.background));
  root.style.setProperty("--foreground", hexToHSL(colors.text));
  root.style.setProperty("--card", hexToHSL(colors.card));
  root.style.setProperty("--card-foreground", hexToHSL(colors.text));
  root.style.setProperty("--primary", hexToHSL(colors.primary));
  root.style.setProperty("--primary-foreground", hexToHSL(colors.background));
  root.style.setProperty("--secondary", hexToHSL(colors.secondary));
  root.style.setProperty("--muted", hexToHSL(colors.muted));
  root.style.setProperty("--muted-foreground", hexToHSL(colors.muted));
  root.style.setProperty("--border", hexToHSL(colors.border));
  root.style.setProperty("--accent", hexToHSL(colors.accent));

  // Font families (if using custom fonts, they need to be loaded)
  root.style.setProperty("--font-heading", `'${theme.fonts.heading}', sans-serif`);
  root.style.setProperty("--font-body", `'${theme.fonts.body}', sans-serif`);

  // Border radius
  const radiusValue =
    theme.style.borderRadius === "none" ? "0" :
    theme.style.borderRadius === "sm" ? "0.25rem" :
    theme.style.borderRadius === "md" ? "0.5rem" :
    theme.style.borderRadius === "lg" ? "1rem" :
    "9999px";
  root.style.setProperty("--radius", radiusValue);
}

// Convert hex to HSL format for shadcn compatibility
function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, "");

  // Parse RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultThemeId?: string;
}

export function ThemeProvider({ children, defaultThemeId = "hip-hop-classic" }: ThemeProviderProps) {
  const [themeSettings, setThemeSettings] = useState<ThemeSettings | null>(null);
  const [theme, setTheme] = useState<ThemeConfig | null>(() => getThemeById(defaultThemeId) || null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreview, setIsPreview] = useState(false);
  const [originalTheme, setOriginalTheme] = useState<ThemeConfig | null>(null);

  // Load theme from API on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const res = await fetch("/api/admin/theme");
        const data = await res.json();

        if (data.success && data.data) {
          setThemeSettings(data.data);
          const loadedTheme = getThemeById(data.data.themeId);
          if (loadedTheme) {
            setTheme(loadedTheme);
            applyThemeToDocument(loadedTheme, data.data.customColors);
          }
        } else {
          // Apply default theme
          const defaultTheme = getThemeById(defaultThemeId);
          if (defaultTheme) {
            setTheme(defaultTheme);
            applyThemeToDocument(defaultTheme);
          }
        }
      } catch (error) {
        console.error("Error loading theme:", error);
        // Apply default theme on error
        const defaultTheme = getThemeById(defaultThemeId);
        if (defaultTheme) {
          setTheme(defaultTheme);
          applyThemeToDocument(defaultTheme);
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Check URL for preview parameter
    const urlParams = new URLSearchParams(window.location.search);
    const previewThemeId = urlParams.get("previewTheme");

    if (previewThemeId) {
      const previewTheme = getThemeById(previewThemeId);
      if (previewTheme) {
        setTheme(previewTheme);
        applyThemeToDocument(previewTheme);
        setIsPreview(true);
        setIsLoading(false);
        return;
      }
    }

    loadTheme();
  }, [defaultThemeId]);

  const applyTheme = (themeId: string) => {
    const newTheme = getThemeById(themeId);
    if (newTheme) {
      setTheme(newTheme);
      applyThemeToDocument(newTheme, themeSettings?.customColors);
    }
  };

  const applyCustomColors = (colors: Partial<ThemeColors>) => {
    if (theme) {
      applyThemeToDocument(theme, colors);
    }
  };

  const previewTheme = (themeId: string) => {
    if (!isPreview && theme) {
      setOriginalTheme(theme);
    }
    const previewTheme = getThemeById(themeId);
    if (previewTheme) {
      setTheme(previewTheme);
      applyThemeToDocument(previewTheme);
      setIsPreview(true);
    }
  };

  const resetPreview = () => {
    if (originalTheme) {
      setTheme(originalTheme);
      applyThemeToDocument(originalTheme, themeSettings?.customColors);
      setOriginalTheme(null);
    }
    setIsPreview(false);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeSettings,
        isLoading,
        applyTheme,
        applyCustomColors,
        previewTheme,
        resetPreview,
        isPreview,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// Preview banner component
export function ThemePreviewBanner() {
  const { isPreview, resetPreview, theme } = useTheme();

  if (!isPreview) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-yellow-500 text-black p-3 flex items-center justify-center gap-4">
      <span className="font-medium">
        Vista previa: {theme?.name}
      </span>
      <button
        onClick={resetPreview}
        className="px-4 py-1 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
      >
        Salir de Vista Previa
      </button>
    </div>
  );
}
