"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Palette,
  ArrowLeft,
  Check,
  Copy,
  Download,
  Code,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Music,
  Disc3,
  Eye,
  ExternalLink,
  Loader2,
  Save,
  RotateCcw,
  Paintbrush,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import THEMES, { type ThemeConfig, type ThemeColors, generateThemeCSS, generateTailwindConfig } from "@/lib/themes";

export default function ThemesPage() {
  const [selectedTheme, setSelectedTheme] = useState<ThemeConfig>(THEMES[0]);
  const [copiedCSS, setCopiedCSS] = useState(false);
  const [copiedTailwind, setCopiedTailwind] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Custom theme state
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customColors, setCustomColors] = useState<ThemeColors>({
    primary: "#f97316",
    secondary: "#ea580c",
    accent: "#fb923c",
    background: "#0a0a0a",
    card: "#1a1a1a",
    border: "#2a2a2a",
    text: "#ffffff",
    muted: "#888888",
  });

  // Load current theme on mount
  useEffect(() => {
    const loadCurrentTheme = async () => {
      try {
        const res = await fetch("/api/admin/theme");
        const data = await res.json();
        if (data.success && data.data) {
          const themeId = data.data.themeId;
          const foundTheme = THEMES.find((t) => t.id === themeId);
          if (foundTheme) {
            setSelectedTheme(foundTheme);
          }
          if (data.data.customColors) {
            setCustomColors({ ...customColors, ...data.data.customColors });
            setIsCustomMode(data.data.isCustom || false);
          }
        }
      } catch (error) {
        console.error("Error loading theme:", error);
      } finally {
        setLoading(false);
      }
    };
    loadCurrentTheme();
  }, []);

  const handleCopyCSS = () => {
    const themeToExport = isCustomMode
      ? { ...selectedTheme, colors: customColors }
      : selectedTheme;
    navigator.clipboard.writeText(generateThemeCSS(themeToExport));
    setCopiedCSS(true);
    setTimeout(() => setCopiedCSS(false), 2000);
  };

  const handleCopyTailwind = () => {
    const themeToExport = isCustomMode
      ? { ...selectedTheme, colors: customColors }
      : selectedTheme;
    navigator.clipboard.writeText(generateTailwindConfig(themeToExport));
    setCopiedTailwind(true);
    setTimeout(() => setCopiedTailwind(false), 2000);
  };

  const handleDownloadTheme = () => {
    const themeToExport = isCustomMode
      ? { ...selectedTheme, colors: customColors }
      : selectedTheme;
    const themeData = {
      theme: themeToExport,
      css: generateThemeCSS(themeToExport),
      tailwind: generateTailwindConfig(themeToExport),
      generatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(themeData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `theme-${selectedTheme.id}${isCustomMode ? "-custom" : ""}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApplyTheme = async () => {
    setSaving(true);
    setSavedMessage(null);
    try {
      const res = await fetch("/api/admin/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeId: selectedTheme.id,
          customColors: isCustomMode ? customColors : null,
          isCustom: isCustomMode,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedMessage("Tema aplicado correctamente. Recarga la página para ver los cambios.");
      } else {
        setSavedMessage("Error al guardar el tema");
      }
    } catch (error) {
      setSavedMessage("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    const previewUrl = `/?previewTheme=${selectedTheme.id}`;
    window.open(previewUrl, "_blank");
  };

  const handleResetColors = () => {
    setCustomColors(selectedTheme.colors);
  };

  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    setCustomColors((prev) => ({ ...prev, [key]: value }));
  };

  // Get colors to display (custom or theme)
  const displayColors = isCustomMode ? customColors : selectedTheme.colors;

  if (loading) {
    return (
      <div className="min-h-screen bg-slc-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slc-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin/export">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-oswald text-3xl uppercase mb-1">
                Selector de Temas
              </h1>
              <p className="text-slc-muted">
                Elige un tema visual para tu colectivo musical
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handlePreview}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              Vista Previa
            </Button>
            <Button
              onClick={handleApplyTheme}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Aplicar Tema
            </Button>
          </div>
        </div>

        {/* Success/Error Message */}
        {savedMessage && (
          <div
            className={cn(
              "mb-6 p-4 rounded-xl flex items-center gap-3",
              savedMessage.includes("Error")
                ? "bg-red-500/10 border border-red-500/30 text-red-400"
                : "bg-green-500/10 border border-green-500/30 text-green-400"
            )}
          >
            {savedMessage.includes("Error") ? null : <Check className="w-5 h-5" />}
            {savedMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Theme Grid */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-oswald text-xl uppercase">Temas Disponibles</h2>
              <Button
                variant={isCustomMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsCustomMode(!isCustomMode);
                  if (!isCustomMode) {
                    setCustomColors(selectedTheme.colors);
                  }
                }}
                className="gap-2"
              >
                <Paintbrush className="w-4 h-4" />
                {isCustomMode ? "Modo Personalizado" : "Personalizar Colores"}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => {
                    setSelectedTheme(theme);
                    if (isCustomMode) {
                      setCustomColors(theme.colors);
                    }
                  }}
                  className={cn(
                    "text-left rounded-2xl overflow-hidden border-2 transition-all hover:scale-[1.02]",
                    selectedTheme.id === theme.id
                      ? "border-primary shadow-lg shadow-primary/20"
                      : "border-slc-border hover:border-primary/50"
                  )}
                >
                  {/* Theme Preview Header */}
                  <div
                    className="h-24 relative"
                    style={{ background: theme.preview.gradient }}
                  >
                    {selectedTheme.id === theme.id && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-black" />
                      </div>
                    )}
                    {/* Mock UI Elements */}
                    <div className="absolute bottom-3 left-4 flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full"
                        style={{ backgroundColor: theme.colors.card }}
                      />
                      <div className="space-y-1">
                        <div
                          className="h-2 w-16 rounded"
                          style={{ backgroundColor: theme.colors.text }}
                        />
                        <div
                          className="h-1.5 w-10 rounded"
                          style={{ backgroundColor: theme.colors.muted }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Theme Info */}
                  <div
                    className="p-4"
                    style={{ backgroundColor: theme.colors.card }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3
                        className="font-bold text-lg"
                        style={{
                          color: theme.colors.text,
                          fontFamily: `${theme.fonts.heading}, sans-serif`,
                        }}
                      >
                        {theme.name}
                      </h3>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${theme.colors.primary}20`,
                          color: theme.colors.primary,
                        }}
                      >
                        {theme.genre}
                      </span>
                    </div>
                    <p
                      className="text-sm line-clamp-2"
                      style={{ color: theme.colors.muted }}
                    >
                      {theme.description}
                    </p>

                    {/* Color Swatches */}
                    <div className="flex gap-1 mt-3">
                      {[
                        theme.colors.primary,
                        theme.colors.secondary,
                        theme.colors.accent,
                        theme.colors.background,
                      ].map((color, i) => (
                        <div
                          key={i}
                          className="w-5 h-5 rounded-full border border-white/20"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Theme Details */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              {/* Theme Preview Card */}
              <div
                className="rounded-2xl overflow-hidden border"
                style={{
                  backgroundColor: displayColors.background,
                  borderColor: displayColors.border,
                }}
              >
                {/* Header Preview */}
                <div
                  className="p-4 border-b flex items-center gap-3"
                  style={{ borderColor: displayColors.border }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${displayColors.primary}20` }}
                  >
                    <Disc3
                      className="w-5 h-5"
                      style={{ color: displayColors.primary }}
                    />
                  </div>
                  <div>
                    <h4
                      className="font-bold text-sm uppercase"
                      style={{
                        color: displayColors.text,
                        fontFamily: `${selectedTheme.fonts.heading}, sans-serif`,
                      }}
                    >
                      Tu Colectivo
                    </h4>
                    <p
                      className="text-xs"
                      style={{ color: displayColors.primary }}
                    >
                      {selectedTheme.genre}
                    </p>
                  </div>
                </div>

                {/* Content Preview */}
                <div className="p-4 space-y-3">
                  {/* Card Preview */}
                  <div
                    className="rounded-xl p-3"
                    style={{ backgroundColor: displayColors.card }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-12 h-12 rounded-lg"
                        style={{ backgroundColor: `${displayColors.primary}30` }}
                      />
                      <div className="flex-1">
                        <div
                          className="h-3 w-24 rounded mb-1"
                          style={{ backgroundColor: displayColors.text }}
                        />
                        <div
                          className="h-2 w-16 rounded"
                          style={{ backgroundColor: displayColors.muted }}
                        />
                      </div>
                    </div>
                    <div
                      className="h-2 w-full rounded mb-1"
                      style={{ backgroundColor: `${displayColors.muted}40` }}
                    />
                    <div
                      className="h-2 w-3/4 rounded"
                      style={{ backgroundColor: `${displayColors.muted}40` }}
                    />
                  </div>

                  {/* Button Preview */}
                  <div className="flex gap-2">
                    <button
                      className="flex-1 py-2 px-4 rounded-lg text-sm font-medium"
                      style={{
                        backgroundColor: displayColors.primary,
                        color: displayColors.background,
                        borderRadius:
                          selectedTheme.style.borderRadius === "none" ? "0" :
                          selectedTheme.style.borderRadius === "sm" ? "0.25rem" :
                          selectedTheme.style.borderRadius === "md" ? "0.5rem" :
                          selectedTheme.style.borderRadius === "lg" ? "0.75rem" :
                          "9999px",
                      }}
                    >
                      Primario
                    </button>
                    <button
                      className="flex-1 py-2 px-4 text-sm font-medium border"
                      style={{
                        backgroundColor: "transparent",
                        color: displayColors.text,
                        borderColor: displayColors.border,
                        borderRadius:
                          selectedTheme.style.borderRadius === "none" ? "0" :
                          selectedTheme.style.borderRadius === "sm" ? "0.25rem" :
                          selectedTheme.style.borderRadius === "md" ? "0.5rem" :
                          selectedTheme.style.borderRadius === "lg" ? "0.75rem" :
                          "9999px",
                      }}
                    >
                      Secundario
                    </button>
                  </div>
                </div>
              </div>

              {/* Custom Color Picker (when in custom mode) */}
              {isCustomMode && (
                <div className="bg-slc-card border border-slc-border rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-oswald uppercase">Personalizar Colores</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetColors}
                      className="gap-1 h-7"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Resetear
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {(Object.keys(customColors) as Array<keyof ThemeColors>).map((colorKey) => (
                      <div key={colorKey} className="space-y-1">
                        <label className="text-xs text-slc-muted capitalize">
                          {colorKey}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={customColors[colorKey]}
                            onChange={(e) => handleColorChange(colorKey, e.target.value)}
                            className="w-10 h-8 rounded cursor-pointer border-0"
                          />
                          <Input
                            value={customColors[colorKey]}
                            onChange={(e) => handleColorChange(colorKey, e.target.value)}
                            className="flex-1 h-8 text-xs font-mono"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Theme Details */}
              <div className="bg-slc-card border border-slc-border rounded-2xl p-4 space-y-4">
                <div>
                  <h3 className="font-oswald text-lg uppercase mb-1">
                    {selectedTheme.name}
                    {isCustomMode && <span className="text-primary text-sm ml-2">(Personalizado)</span>}
                  </h3>
                  <p className="text-sm text-slc-muted">
                    {selectedTheme.description}
                  </p>
                </div>

                {/* Fonts */}
                <div>
                  <p className="text-xs text-slc-muted mb-1">Tipografías</p>
                  <p className="text-sm">
                    <span className="font-medium">{selectedTheme.fonts.heading}</span>
                    <span className="text-slc-muted"> / </span>
                    <span>{selectedTheme.fonts.body}</span>
                  </p>
                </div>

                {/* Style */}
                <div>
                  <p className="text-xs text-slc-muted mb-1">Estilo</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-2 py-1 bg-slc-dark rounded-full">
                      Bordes: {selectedTheme.style.borderRadius}
                    </span>
                    <span className="text-xs px-2 py-1 bg-slc-dark rounded-full">
                      Botones: {selectedTheme.style.buttonStyle}
                    </span>
                    <span className="text-xs px-2 py-1 bg-slc-dark rounded-full">
                      Cards: {selectedTheme.style.cardStyle}
                    </span>
                    {selectedTheme.style.animations && (
                      <span className="text-xs px-2 py-1 bg-slc-dark rounded-full">
                        Animaciones
                      </span>
                    )}
                  </div>
                </div>

                {/* Colors (when not in custom mode) */}
                {!isCustomMode && (
                  <div>
                    <p className="text-xs text-slc-muted mb-2">Colores</p>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(selectedTheme.colors).map(([name, color]) => (
                        <div key={name} className="text-center">
                          <div
                            className="w-full aspect-square rounded-lg border border-white/10 mb-1"
                            style={{ backgroundColor: color }}
                          />
                          <p className="text-[10px] text-slc-muted capitalize">{name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 border-t border-slc-border space-y-2">
                  <Button
                    onClick={() => setShowCode(!showCode)}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    <Code className="w-4 h-4" />
                    {showCode ? "Ocultar Código" : "Ver Código"}
                    {showCode ? (
                      <ChevronDown className="w-4 h-4 ml-auto" />
                    ) : (
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    )}
                  </Button>

                  <Button
                    onClick={handleDownloadTheme}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Descargar Tema
                  </Button>
                </div>
              </div>

              {/* Code Section */}
              {showCode && (
                <div className="bg-slc-card border border-slc-border rounded-2xl p-4 space-y-4">
                  {/* CSS Variables */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">CSS Variables</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyCSS}
                        className="gap-1 h-7"
                      >
                        {copiedCSS ? (
                          <>
                            <Check className="w-3 h-3 text-green-500" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copiar
                          </>
                        )}
                      </Button>
                    </div>
                    <pre className="text-xs bg-black/50 rounded-lg p-3 overflow-x-auto max-h-40">
                      <code className="text-slc-muted">
                        {generateThemeCSS(isCustomMode ? { ...selectedTheme, colors: customColors } : selectedTheme)}
                      </code>
                    </pre>
                  </div>

                  {/* Tailwind Config */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Tailwind Config</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyTailwind}
                        className="gap-1 h-7"
                      >
                        {copiedTailwind ? (
                          <>
                            <Check className="w-3 h-3 text-green-500" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copiar
                          </>
                        )}
                      </Button>
                    </div>
                    <pre className="text-xs bg-black/50 rounded-lg p-3 overflow-x-auto max-h-40">
                      <code className="text-slc-muted">
                        {generateTailwindConfig(isCustomMode ? { ...selectedTheme, colors: customColors } : selectedTheme)}
                      </code>
                    </pre>
                  </div>
                </div>
              )}

              {/* Usage Info */}
              <div className="bg-slc-dark/50 rounded-xl p-4 text-xs text-slc-muted">
                <p className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>
                    Haz clic en "Aplicar Tema" para guardar los cambios.
                    Usa "Vista Previa" para ver cómo se verá el sitio público.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
