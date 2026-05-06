"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type ColorMode = "dark" | "light" | "system";

interface ColorModeContextValue {
  colorMode: ColorMode;
  resolvedMode: "dark" | "light";
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
}

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

export function useColorMode() {
  const context = useContext(ColorModeContext);
  if (!context) {
    throw new Error("useColorMode must be used within a ColorModeProvider");
  }
  return context;
}

// Light mode color adjustments
const lightModeOverrides = {
  "--slc-background": "#f8f8f8",
  "--slc-card": "#ffffff",
  "--slc-border": "#e5e5e5",
  "--slc-text": "#171717",
  "--slc-muted": "#737373",
  // shadcn overrides
  "--background": "0 0% 97%",
  "--foreground": "0 0% 9%",
  "--card": "0 0% 100%",
  "--card-foreground": "0 0% 9%",
  "--muted": "0 0% 45%",
  "--muted-foreground": "0 0% 45%",
  "--border": "0 0% 90%",
  "--input": "0 0% 90%",
  "--popover": "0 0% 100%",
  "--popover-foreground": "0 0% 9%",
};

// Dark mode color adjustments (defaults)
const darkModeOverrides = {
  "--slc-background": "#0a0a0a",
  "--slc-card": "#1a1a1a",
  "--slc-border": "#2a2a2a",
  "--slc-text": "#ffffff",
  "--slc-muted": "#888888",
  // shadcn overrides
  "--background": "0 0% 4%",
  "--foreground": "0 0% 100%",
  "--card": "0 0% 10%",
  "--card-foreground": "0 0% 100%",
  "--muted": "0 0% 53%",
  "--muted-foreground": "0 0% 53%",
  "--border": "0 0% 16%",
  "--input": "0 0% 16%",
  "--popover": "0 0% 10%",
  "--popover-foreground": "0 0% 100%",
};

function applyColorMode(mode: "dark" | "light") {
  const root = document.documentElement;
  const overrides = mode === "light" ? lightModeOverrides : darkModeOverrides;

  Object.entries(overrides).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // Update body class for any CSS-based styling
  if (mode === "light") {
    root.classList.add("light-mode");
    root.classList.remove("dark-mode");
  } else {
    root.classList.add("dark-mode");
    root.classList.remove("light-mode");
  }
}

function getSystemPreference(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

interface ColorModeProviderProps {
  children: ReactNode;
  defaultMode?: ColorMode;
}

export function ColorModeProvider({ children, defaultMode = "dark" }: ColorModeProviderProps) {
  const [colorMode, setColorModeState] = useState<ColorMode>(defaultMode);
  const [resolvedMode, setResolvedMode] = useState<"dark" | "light">("dark");

  // Load saved preference on mount
  useEffect(() => {
    const saved = localStorage.getItem("color-mode") as ColorMode | null;
    if (saved && ["dark", "light", "system"].includes(saved)) {
      setColorModeState(saved);
    }
  }, []);

  // Apply color mode whenever it changes
  useEffect(() => {
    let resolved: "dark" | "light";

    if (colorMode === "system") {
      resolved = getSystemPreference();
    } else {
      resolved = colorMode;
    }

    setResolvedMode(resolved);
    applyColorMode(resolved);
    localStorage.setItem("color-mode", colorMode);
  }, [colorMode]);

  // Listen for system preference changes
  useEffect(() => {
    if (colorMode !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? "dark" : "light";
      setResolvedMode(resolved);
      applyColorMode(resolved);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [colorMode]);

  const setColorMode = (mode: ColorMode) => {
    setColorModeState(mode);
  };

  const toggleColorMode = () => {
    setColorModeState((prev) => {
      if (prev === "dark") return "light";
      if (prev === "light") return "dark";
      // If system, toggle to opposite of current resolved
      return resolvedMode === "dark" ? "light" : "dark";
    });
  };

  return (
    <ColorModeContext.Provider
      value={{
        colorMode,
        resolvedMode,
        setColorMode,
        toggleColorMode,
      }}
    >
      {children}
    </ColorModeContext.Provider>
  );
}

// Color Mode Toggle Button Component
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColorModeToggleProps {
  className?: string;
  showLabels?: boolean;
  variant?: "icon" | "pills" | "dropdown";
}

export function ColorModeToggle({ className, showLabels = false, variant = "icon" }: ColorModeToggleProps) {
  const { colorMode, resolvedMode, setColorMode, toggleColorMode } = useColorMode();

  if (variant === "icon") {
    return (
      <button
        onClick={toggleColorMode}
        className={cn(
          "p-2 rounded-lg transition-colors hover:bg-[var(--slc-card)] border border-transparent hover:border-[var(--slc-border)]",
          className
        )}
        title={resolvedMode === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        aria-label="Toggle color mode"
      >
        {resolvedMode === "dark" ? (
          <Sun className="w-5 h-5 text-[var(--slc-muted)] hover:text-[var(--slc-text)]" />
        ) : (
          <Moon className="w-5 h-5 text-[var(--slc-muted)] hover:text-[var(--slc-text)]" />
        )}
      </button>
    );
  }

  if (variant === "pills") {
    return (
      <div className={cn("flex items-center gap-1 p-1 bg-[var(--slc-card)] rounded-lg border border-[var(--slc-border)]", className)}>
        <button
          onClick={() => setColorMode("light")}
          className={cn(
            "p-2 rounded-md transition-colors",
            colorMode === "light"
              ? "bg-[var(--slc-background)] text-[var(--slc-text)] shadow-sm"
              : "text-[var(--slc-muted)] hover:text-[var(--slc-text)]"
          )}
          title="Modo claro"
        >
          <Sun className="w-4 h-4" />
        </button>
        <button
          onClick={() => setColorMode("dark")}
          className={cn(
            "p-2 rounded-md transition-colors",
            colorMode === "dark"
              ? "bg-[var(--slc-background)] text-[var(--slc-text)] shadow-sm"
              : "text-[var(--slc-muted)] hover:text-[var(--slc-text)]"
          )}
          title="Modo oscuro"
        >
          <Moon className="w-4 h-4" />
        </button>
        <button
          onClick={() => setColorMode("system")}
          className={cn(
            "p-2 rounded-md transition-colors",
            colorMode === "system"
              ? "bg-[var(--slc-background)] text-[var(--slc-text)] shadow-sm"
              : "text-[var(--slc-muted)] hover:text-[var(--slc-text)]"
          )}
          title="Seguir sistema"
        >
          <Monitor className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Dropdown variant
  return (
    <div className={cn("relative group", className)}>
      <button
        className="p-2 rounded-lg transition-colors hover:bg-[var(--slc-card)] border border-transparent hover:border-[var(--slc-border)]"
        title="Modo de color"
      >
        {resolvedMode === "dark" ? (
          <Moon className="w-5 h-5 text-[var(--slc-muted)]" />
        ) : (
          <Sun className="w-5 h-5 text-[var(--slc-muted)]" />
        )}
      </button>
      <div className="absolute right-0 top-full mt-2 py-2 bg-[var(--slc-card)] border border-[var(--slc-border)] rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[140px] z-50">
        <button
          onClick={() => setColorMode("light")}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors",
            colorMode === "light"
              ? "text-primary"
              : "text-[var(--slc-muted)] hover:text-[var(--slc-text)] hover:bg-[var(--slc-background)]"
          )}
        >
          <Sun className="w-4 h-4" />
          Claro
        </button>
        <button
          onClick={() => setColorMode("dark")}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors",
            colorMode === "dark"
              ? "text-primary"
              : "text-[var(--slc-muted)] hover:text-[var(--slc-text)] hover:bg-[var(--slc-background)]"
          )}
        >
          <Moon className="w-4 h-4" />
          Oscuro
        </button>
        <button
          onClick={() => setColorMode("system")}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors",
            colorMode === "system"
              ? "text-primary"
              : "text-[var(--slc-muted)] hover:text-[var(--slc-text)] hover:bg-[var(--slc-background)]"
          )}
        >
          <Monitor className="w-4 h-4" />
          Sistema
        </button>
      </div>
    </div>
  );
}
