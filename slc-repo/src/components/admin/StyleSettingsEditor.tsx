"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DirectDropboxUploader } from "@/components/admin/DirectDropboxUploader";
import {
  Palette,
  Type,
  Sparkles,
  Monitor,
  ChevronDown,
  ChevronUp,
  Check,
  RotateCcw,
  Image as ImageIcon,
  Zap,
  Layout,
  Eye,
  X,
  Wand2,
  Play,
  Moon,
  Sun,
  Smartphone,
  Tablet,
  Save,
  FolderOpen,
  User,
  Link2,
} from "lucide-react";
import {
  availableFonts,
  fontCategories,
  colorPresets,
  backgroundStyles,
  titleStyles,
  animationPresets,
  stylePresets,
  defaultStyleSettings,
  getGoogleFontsUrl,
  animationKeyframes,
  responsiveBreakpoints,
  type StyleSettings,
  type ResponsiveBreakpoint,
} from "@/lib/style-config";

interface CustomStyle {
  id: string;
  name: string;
  description: string | null;
  settings: Partial<StyleSettings>;
  category: string;
  artistId: string | null;
}

interface ArtistStyle {
  id: string;
  artistId: string;
  settings: Partial<StyleSettings>;
  applyToNewContent: boolean;
}

interface StyleSettingsEditorProps {
  value: Partial<StyleSettings>;
  onChange: (settings: Partial<StyleSettings>) => void;
  showPreview?: boolean;
  previewTitle?: string;
  previewSubtitle?: string;
  artistId?: string;
  category?: "campaign" | "beat" | "media" | "general";
}

export function StyleSettingsEditor({
  value,
  onChange,
  showPreview = true,
  previewTitle = "Vista Previa",
  previewSubtitle = "Así se verá el contenido con estos estilos",
  artistId,
  category = "general",
}: StyleSettingsEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true); // Start expanded by default
  const [activeTab, setActiveTab] = useState<"presets" | "colors" | "fonts" | "effects" | "background" | "library">("presets");
  const [selectedFontCategory, setSelectedFontCategory] = useState<string>("display");
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<ResponsiveBreakpoint>("desktop");
  const [savedStyles, setSavedStyles] = useState<CustomStyle[]>([]);
  const [artistStyle, setArtistStyle] = useState<ArtistStyle | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [styleName, setStyleName] = useState("");
  const [styleDescription, setStyleDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const settings = { ...defaultStyleSettings, ...value };

  // Fetch saved styles and artist style on mount
  useEffect(() => {
    fetchSavedStyles();
    if (artistId) {
      fetchArtistStyle();
    }
  }, [artistId, category]);

  const fetchSavedStyles = async () => {
    try {
      const params = new URLSearchParams();
      params.set("category", category);
      params.set("includePublic", "true");
      if (artistId) {
        params.set("artistId", artistId);
      }
      const res = await fetch(`/api/admin/styles?${params}`);
      if (!res.ok) {
        console.warn("Styles API returned error:", res.status);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setSavedStyles(data.data || []);
      }
    } catch (error) {
      // Silently fail - styles library is optional
      console.warn("Could not fetch saved styles:", error);
    }
  };

  const fetchArtistStyle = async () => {
    if (!artistId) return;
    try {
      const res = await fetch(`/api/admin/artists/${artistId}/style`);
      if (!res.ok) {
        console.warn("Artist style API returned error:", res.status);
        return;
      }
      const data = await res.json();
      if (data.success && data.data) {
        setArtistStyle(data.data);
      }
    } catch (error) {
      // Silently fail - artist styles are optional
      console.warn("Could not fetch artist style:", error);
    }
  };

  const handleChange = (key: keyof StyleSettings, newValue: unknown) => {
    onChange({ ...value, [key]: newValue });
  };

  const handleColorPresetChange = (presetValue: string) => {
    const preset = colorPresets.find(p => p.value === presetValue);
    if (preset && preset.value !== "custom") {
      onChange({
        ...value,
        colorPreset: presetValue,
        primaryColor: preset.primary,
        secondaryColor: preset.secondary,
        accentColor: preset.accent,
      });
    } else {
      onChange({
        ...value,
        colorPreset: presetValue,
      });
    }
  };

  const applyPreset = (presetId: string) => {
    const preset = stylePresets.find(p => p.id === presetId);
    if (preset) {
      onChange({
        ...value,
        ...preset.settings,
      });
    }
  };

  const applySavedStyle = (style: CustomStyle) => {
    onChange({
      ...value,
      ...style.settings,
    });
  };

  const applyArtistStyle = () => {
    if (artistStyle) {
      onChange({
        ...value,
        ...artistStyle.settings,
      });
    }
  };

  const toggleDarkMode = () => {
    const newDarkMode = !settings.darkMode;
    // When switching modes, also update background style if needed
    const currentBg = backgroundStyles.find(bg => bg.value === settings.backgroundStyle);
    let newBackgroundStyle = settings.backgroundStyle;

    if (currentBg?.mode === "dark" && !newDarkMode) {
      // Switch to light background
      newBackgroundStyle = "solid-light";
    } else if (currentBg?.mode === "light" && newDarkMode) {
      // Switch to dark background
      newBackgroundStyle = "gradient-dark";
    }

    onChange({
      ...value,
      darkMode: newDarkMode,
      backgroundStyle: newBackgroundStyle,
      textColor: newDarkMode ? "#ffffff" : "#1a1a1a",
    });
  };

  const resetToDefault = () => {
    onChange(defaultStyleSettings);
  };

  const handleBackgroundImageUpload = (url: string) => {
    onChange({
      ...value,
      backgroundStyle: "custom-image",
      backgroundImageUrl: url,
    });
  };

  const saveAsNewStyle = async () => {
    if (!styleName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/styles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: styleName,
          description: styleDescription,
          settings: value,
          category,
          artistId,
          isPublic: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowSaveModal(false);
        setStyleName("");
        setStyleDescription("");
        fetchSavedStyles();
      }
    } catch (error) {
      console.error("Error saving style:", error);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "presets", label: "Presets", icon: Wand2 },
    { id: "colors", label: "Colores", icon: Palette },
    { id: "fonts", label: "Fuentes", icon: Type },
    { id: "effects", label: "Efectos", icon: Sparkles },
    { id: "background", label: "Fondo", icon: ImageIcon },
    { id: "library", label: "Librería", icon: FolderOpen },
  ];

  const filteredFonts = availableFonts.filter(f => f.category === selectedFontCategory);
  const filteredBackgrounds = backgroundStyles.filter(
    bg => bg.mode === "both" || bg.mode === (settings.darkMode ? "dark" : "light")
  );

  return (
    <div className="bg-slc-dark border border-slc-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slc-card/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
            }}
          >
            <Palette className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-oswald text-xl uppercase text-primary">Personalización Visual</h3>
            <p className="text-sm text-slc-muted">Colores, fuentes, animaciones y más</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Dark/Light mode toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleDarkMode();
            }}
            className={`p-2 rounded-lg transition-colors ${
              settings.darkMode ? "bg-zinc-800 text-yellow-400" : "bg-yellow-100 text-yellow-600"
            }`}
            title={settings.darkMode ? "Modo Oscuro" : "Modo Claro"}
          >
            {settings.darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {showPreview && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowFullPreview(true);
              }}
              className="gap-1"
            >
              <Eye className="w-4 h-4" />
              Preview
            </Button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slc-muted" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slc-muted" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-slc-card rounded-lg overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-primary text-white"
                    : "text-slc-muted hover:text-white hover:bg-white/5"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Artist Style Inheritance Banner */}
          {artistId && artistStyle && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-blue-300">
                  Estilo del artista disponible
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={applyArtistStyle}
                className="text-blue-400 border-blue-400/50 hover:bg-blue-500/20"
              >
                <Link2 className="w-3 h-3 mr-1" />
                Aplicar
              </Button>
            </div>
          )}

          {/* Quick Preview */}
          {showPreview && (
            <div
              className={`rounded-lg p-6 text-center transition-all ${
                settings.darkMode ? "" : "border border-gray-200"
              }`}
              style={{
                background: settings.backgroundStyle === "custom-image" && settings.backgroundImageUrl
                  ? `linear-gradient(rgba(0,0,0,${settings.backgroundOverlayOpacity / 100}), rgba(0,0,0,${settings.backgroundOverlayOpacity / 100})), url(${settings.backgroundImageUrl})`
                  : settings.darkMode
                  ? `linear-gradient(135deg, ${settings.primaryColor}20, ${settings.secondaryColor}10)`
                  : `linear-gradient(135deg, ${settings.primaryColor}10, white)`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                borderColor: settings.primaryColor,
                borderWidth: settings.darkMode ? "1px" : undefined,
              }}
            >
              <p
                className={`text-2xl mb-2 ${
                  availableFonts.find(f => f.value === settings.titleFont)?.className || "font-oswald"
                } ${settings.titleStyle === "uppercase" ? "uppercase" : ""}`}
                style={{
                  color: settings.titleStyle === "gradient" ? "transparent" : (settings.darkMode ? settings.primaryColor : settings.primaryColor),
                  background: settings.titleStyle === "gradient"
                    ? `linear-gradient(to right, ${settings.primaryColor}, ${settings.secondaryColor})`
                    : undefined,
                  WebkitBackgroundClip: settings.titleStyle === "gradient" ? "text" : undefined,
                  textShadow: settings.titleStyle === "shadow" ? `0 0 25px ${settings.primaryColor}` : undefined,
                }}
              >
                {previewTitle}
              </p>
              <p
                className={`text-sm opacity-80 ${
                  availableFonts.find(f => f.value === settings.bodyFont)?.className || "font-sans"
                }`}
                style={{ color: settings.darkMode ? "#999" : "#666" }}
              >
                {previewSubtitle}
              </p>
              <button
                type="button"
                className="mt-4 px-6 py-2 text-sm font-medium transition-all"
                style={{
                  background: settings.buttonStyle === "gradient"
                    ? `linear-gradient(to right, ${settings.primaryColor}, ${settings.secondaryColor})`
                    : settings.buttonStyle === "solid"
                    ? settings.primaryColor
                    : settings.buttonStyle === "glass"
                    ? "rgba(255,255,255,0.1)"
                    : "transparent",
                  border: settings.buttonStyle === "outline"
                    ? `2px solid ${settings.primaryColor}`
                    : settings.buttonStyle === "glass"
                    ? "1px solid rgba(255,255,255,0.2)"
                    : "none",
                  backdropFilter: settings.buttonStyle === "glass" ? "blur(10px)" : undefined,
                  borderRadius: settings.buttonRounded === "full" ? "9999px"
                    : settings.buttonRounded === "lg" ? "0.5rem"
                    : settings.buttonRounded === "md" ? "0.375rem"
                    : settings.buttonRounded === "sm" ? "0.25rem"
                    : "0",
                  color: settings.buttonStyle === "outline" ? settings.primaryColor : "white",
                  boxShadow: settings.enableGlow ? `0 5px 20px -5px ${settings.primaryColor}50` : undefined,
                }}
              >
                Botón de Ejemplo
              </button>
            </div>
          )}

          {/* Tab Content */}
          <div className="min-h-[200px]">
            {/* Presets Tab */}
            {activeTab === "presets" && (
              <div className="space-y-4">
                <p className="text-sm text-slc-muted">
                  Selecciona un preset para aplicar un estilo completo rápidamente.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {stylePresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.id)}
                      className="group relative p-3 rounded-lg border border-slc-border hover:border-primary transition-all text-left"
                    >
                      <div
                        className="w-full h-16 rounded-md mb-2"
                        style={{
                          background: `linear-gradient(135deg, ${preset.settings.primaryColor}, ${preset.settings.secondaryColor})`,
                        }}
                      />
                      <p className="font-medium text-sm">{preset.name}</p>
                      <p className="text-xs text-slc-muted line-clamp-1">{preset.description}</p>
                      <div className="absolute inset-0 rounded-lg bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-primary text-white text-xs px-3 py-1 rounded-full">Aplicar</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Colors Tab */}
            {activeTab === "colors" && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {colorPresets.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => handleColorPresetChange(preset.value)}
                      className={`group relative p-2 rounded-lg border-2 transition-all ${
                        settings.colorPreset === preset.value
                          ? "border-white ring-2 ring-white/20"
                          : "border-slc-border hover:border-white/50"
                      }`}
                    >
                      {preset.value === "custom" ? (
                        <div className="w-full aspect-square rounded-md bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500" />
                      ) : preset.value === "neon" ? (
                        <div
                          className="w-full aspect-square rounded-md"
                          style={{
                            background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`,
                            boxShadow: `0 0 20px ${preset.primary}`,
                          }}
                        />
                      ) : (
                        <div
                          className="w-full aspect-square rounded-md"
                          style={{
                            background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`,
                          }}
                        />
                      )}
                      <p className="text-xs mt-1 truncate">{preset.label}</p>
                      {settings.colorPreset === preset.value && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-black" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Custom Colors */}
                {settings.colorPreset === "custom" && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slc-card rounded-lg">
                    <div>
                      <label className="block text-xs text-slc-muted mb-1">Primario</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={settings.primaryColor}
                          onChange={(e) => handleChange("primaryColor", e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <Input
                          value={settings.primaryColor}
                          onChange={(e) => handleChange("primaryColor", e.target.value)}
                          className="flex-1 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slc-muted mb-1">Secundario</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={settings.secondaryColor}
                          onChange={(e) => handleChange("secondaryColor", e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <Input
                          value={settings.secondaryColor}
                          onChange={(e) => handleChange("secondaryColor", e.target.value)}
                          className="flex-1 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slc-muted mb-1">Acento</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={settings.accentColor}
                          onChange={(e) => handleChange("accentColor", e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <Input
                          value={settings.accentColor}
                          onChange={(e) => handleChange("accentColor", e.target.value)}
                          className="flex-1 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slc-muted mb-1">Texto</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={settings.textColor}
                          onChange={(e) => handleChange("textColor", e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <Input
                          value={settings.textColor}
                          onChange={(e) => handleChange("textColor", e.target.value)}
                          className="flex-1 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Fonts Tab */}
            {activeTab === "fonts" && (
              <div className="space-y-4">
                {/* Font Categories */}
                <div className="flex gap-2 flex-wrap">
                  {fontCategories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setSelectedFontCategory(cat.value)}
                      className={`px-3 py-1 rounded-full text-xs transition-all ${
                        selectedFontCategory === cat.value
                          ? "bg-primary text-white"
                          : "bg-slc-card text-slc-muted hover:text-white"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slc-muted mb-2">Fuente de Títulos</label>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {filteredFonts.map((font) => (
                        <button
                          key={font.value}
                          type="button"
                          onClick={() => handleChange("titleFont", font.value)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
                            settings.titleFont === font.value
                              ? "border-primary bg-primary/10"
                              : "border-slc-border hover:border-white/30"
                          }`}
                        >
                          <span className={`${font.className} text-lg`}>{font.preview}</span>
                          <span className="text-xs text-slc-muted">{font.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-slc-muted mb-2">Fuente de Cuerpo</label>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {availableFonts.filter(f => f.category === "sans" || f.category === "serif").map((font) => (
                        <button
                          key={font.value}
                          type="button"
                          onClick={() => handleChange("bodyFont", font.value)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
                            settings.bodyFont === font.value
                              ? "border-primary bg-primary/10"
                              : "border-slc-border hover:border-white/30"
                          }`}
                        >
                          <span className={`${font.className}`}>{font.preview}</span>
                          <span className="text-xs text-slc-muted">{font.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Title Style */}
                <div>
                  <label className="block text-sm text-slc-muted mb-2">Estilo de Títulos</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {titleStyles.map((style) => (
                      <button
                        key={style.value}
                        type="button"
                        onClick={() => handleChange("titleStyle", style.value)}
                        className={`px-3 py-2 rounded-lg border text-xs transition-all ${
                          settings.titleStyle === style.value
                            ? "border-primary bg-primary/10"
                            : "border-slc-border hover:border-white/30"
                        }`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Effects Tab */}
            {activeTab === "effects" && (
              <div className="space-y-4">
                {/* Animation Presets */}
                <div>
                  <label className="block text-sm text-slc-muted mb-2 flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Animación de Entrada
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {animationPresets.map((anim) => (
                      <button
                        key={anim.value}
                        type="button"
                        onClick={() => handleChange("animationPreset", anim.value)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          settings.animationPreset === anim.value
                            ? "border-primary bg-primary/10"
                            : "border-slc-border hover:border-white/30"
                        }`}
                      >
                        <p className="font-medium text-sm">{anim.label}</p>
                        <p className="text-xs text-slc-muted">{anim.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Button Style */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slc-muted mb-2">Estilo de Botones</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["solid", "gradient", "outline", "glass"] as const).map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => handleChange("buttonStyle", style)}
                          className={`px-3 py-2 rounded-lg border text-sm capitalize transition-all ${
                            settings.buttonStyle === style
                              ? "border-primary bg-primary/10"
                              : "border-slc-border hover:border-white/30"
                          }`}
                        >
                          {style === "solid" ? "Sólido" :
                           style === "gradient" ? "Gradiente" :
                           style === "outline" ? "Contorno" : "Cristal"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-slc-muted mb-2">Bordes de Botones</label>
                    <div className="grid grid-cols-5 gap-1">
                      {(["none", "sm", "md", "lg", "full"] as const).map((rounded) => (
                        <button
                          key={rounded}
                          type="button"
                          onClick={() => handleChange("buttonRounded", rounded)}
                          className={`px-2 py-2 border text-xs uppercase transition-all ${
                            settings.buttonRounded === rounded
                              ? "border-primary bg-primary/10"
                              : "border-slc-border hover:border-white/30"
                          }`}
                          style={{
                            borderRadius: rounded === "full" ? "9999px"
                              : rounded === "lg" ? "0.5rem"
                              : rounded === "md" ? "0.375rem"
                              : rounded === "sm" ? "0.25rem"
                              : "0",
                          }}
                        >
                          {rounded}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Effects Toggles */}
                <div>
                  <label className="block text-sm text-slc-muted mb-2">Efectos Visuales</label>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slc-border cursor-pointer hover:border-white/30">
                      <input
                        type="checkbox"
                        checked={settings.enableGlow}
                        onChange={(e) => handleChange("enableGlow", e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm">Glow</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slc-border cursor-pointer hover:border-white/30">
                      <input
                        type="checkbox"
                        checked={settings.enableAnimations}
                        onChange={(e) => handleChange("enableAnimations", e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm">Animaciones</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slc-border cursor-pointer hover:border-white/30">
                      <input
                        type="checkbox"
                        checked={settings.enableParticles}
                        onChange={(e) => handleChange("enableParticles", e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm">Partículas</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Background Tab */}
            {activeTab === "background" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slc-muted mb-2">Estilo de Fondo</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {filteredBackgrounds.map((bg) => (
                      <button
                        key={bg.value}
                        type="button"
                        onClick={() => handleChange("backgroundStyle", bg.value)}
                        className={`px-3 py-3 rounded-lg border text-sm transition-all ${
                          settings.backgroundStyle === bg.value
                            ? "border-primary bg-primary/10"
                            : "border-slc-border hover:border-white/30"
                        }`}
                      >
                        {bg.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background Image Upload */}
                {settings.backgroundStyle === "custom-image" && (
                  <div className="p-4 bg-slc-card rounded-lg space-y-3">
                    <label className="block text-sm text-slc-muted">Imagen de Fondo</label>

                    {settings.backgroundImageUrl && (
                      <div className="relative aspect-video rounded-lg overflow-hidden">
                        <img
                          src={settings.backgroundImageUrl}
                          alt="Background preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleChange("backgroundImageUrl", "")}
                          className="absolute top-2 right-2 p-1 bg-red-500 rounded-full"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <DirectDropboxUploader
                      onUploadComplete={(url) => handleBackgroundImageUpload(url)}
                      accept="image/*"
                      maxSize={10}
                      folder="/backgrounds"
                      label="Subir imagen de fondo"
                      currentUrl={settings.backgroundImageUrl}
                    />

                    <div>
                      <label className="block text-xs text-slc-muted mb-1">
                        Opacidad del overlay: {settings.backgroundOverlayOpacity}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.backgroundOverlayOpacity}
                        onChange={(e) => handleChange("backgroundOverlayOpacity", parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slc-muted mb-1">
                        Desenfoque: {settings.backgroundBlur}px
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        value={settings.backgroundBlur}
                        onChange={(e) => handleChange("backgroundBlur", parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Library Tab */}
            {activeTab === "library" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slc-muted">
                    Guarda y reutiliza estilos personalizados.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowSaveModal(true)}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Guardar Estilo
                  </Button>
                </div>

                {savedStyles.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {savedStyles.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => applySavedStyle(style)}
                        className="group relative p-3 rounded-lg border border-slc-border hover:border-primary transition-all text-left"
                      >
                        <div
                          className="w-full h-12 rounded-md mb-2"
                          style={{
                            background: `linear-gradient(135deg, ${
                              style.settings.primaryColor || defaultStyleSettings.primaryColor
                            }, ${
                              style.settings.secondaryColor || defaultStyleSettings.secondaryColor
                            })`,
                          }}
                        />
                        <p className="font-medium text-sm truncate">{style.name}</p>
                        {style.description && (
                          <p className="text-xs text-slc-muted line-clamp-1">{style.description}</p>
                        )}
                        <div className="absolute inset-0 rounded-lg bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="bg-primary text-white text-xs px-3 py-1 rounded-full">Aplicar</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slc-card rounded-lg">
                    <FolderOpen className="w-10 h-10 mx-auto text-slc-muted mb-2" />
                    <p className="text-sm text-slc-muted">
                      No hay estilos guardados
                    </p>
                    <p className="text-xs text-slc-muted/60 mt-1">
                      Guarda el estilo actual para reutilizarlo después
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reset Button */}
          <div className="flex justify-end pt-2 border-t border-slc-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetToDefault}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Restablecer
            </Button>
          </div>
        </div>
      )}

      {/* Full Preview Modal with Responsive Modes */}
      {showFullPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-xl flex flex-col bg-slc-dark border border-slc-border">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slc-border">
              <h3 className="font-oswald text-lg uppercase">Vista Previa</h3>

              {/* Responsive Mode Toggle */}
              <div className="flex items-center gap-1 bg-slc-card rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setPreviewMode("mobile")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors ${
                    previewMode === "mobile"
                      ? "bg-primary text-white"
                      : "text-slc-muted hover:text-white"
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span className="hidden sm:inline">Mobile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("tablet")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors ${
                    previewMode === "tablet"
                      ? "bg-primary text-white"
                      : "text-slc-muted hover:text-white"
                  }`}
                >
                  <Tablet className="w-4 h-4" />
                  <span className="hidden sm:inline">Tablet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("desktop")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors ${
                    previewMode === "desktop"
                      ? "bg-primary text-white"
                      : "text-slc-muted hover:text-white"
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  <span className="hidden sm:inline">Desktop</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowFullPreview(false)}
                className="p-2 hover:bg-slc-card rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Preview Container */}
            <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-zinc-900">
              <div
                className="transition-all duration-300 overflow-hidden rounded-lg shadow-2xl"
                style={{
                  width: previewMode === "desktop" ? "100%" : responsiveBreakpoints[previewMode].width,
                  maxWidth: previewMode === "desktop" ? "100%" : responsiveBreakpoints[previewMode].width,
                  minHeight: previewMode === "desktop" ? "auto" : Math.min(responsiveBreakpoints[previewMode].height, 600),
                }}
              >
                {/* Full Preview Content */}
                <div
                  className="min-h-[500px] p-8 rounded-xl"
                  style={{
                    background: settings.backgroundStyle === "custom-image" && settings.backgroundImageUrl
                      ? `linear-gradient(rgba(0,0,0,${settings.backgroundOverlayOpacity / 100}), rgba(0,0,0,${settings.backgroundOverlayOpacity / 100})), url(${settings.backgroundImageUrl})`
                      : settings.backgroundStyle === "gradient-radial"
                      ? `radial-gradient(ellipse at center, ${settings.primaryColor}20, ${settings.darkMode ? "#0a0a0a" : "white"})`
                      : settings.darkMode
                      ? `linear-gradient(135deg, ${settings.primaryColor}20, ${settings.secondaryColor}10, transparent)`
                      : `linear-gradient(135deg, ${settings.primaryColor}10, white, ${settings.secondaryColor}05)`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {/* Inject animation keyframes */}
                  <style dangerouslySetInnerHTML={{ __html: animationKeyframes }} />

                  <div className="flex flex-col items-center justify-center text-center space-y-6">
                    {/* Badge */}
                    <div
                      className="px-4 py-2 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: `${settings.accentColor}20`,
                        border: `1px solid ${settings.accentColor}40`,
                        color: settings.accentColor,
                      }}
                    >
                      Contenido Desbloqueado
                    </div>

                    {/* Cover placeholder */}
                    <div
                      className="w-48 h-48 rounded-xl"
                      style={{
                        background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
                        boxShadow: settings.enableGlow ? `0 20px 50px -10px ${settings.primaryColor}50` : undefined,
                      }}
                    />

                    {/* Title */}
                    <h1
                      className={`text-4xl ${
                        availableFonts.find(f => f.value === settings.titleFont)?.className || "font-oswald"
                      } ${settings.titleStyle === "uppercase" ? "uppercase" : ""}`}
                      style={{
                        color: settings.titleStyle === "gradient" ? "transparent" : (settings.darkMode ? settings.textColor : "#1a1a1a"),
                        background: settings.titleStyle === "gradient"
                          ? `linear-gradient(to right, ${settings.primaryColor}, ${settings.secondaryColor})`
                          : undefined,
                        WebkitBackgroundClip: settings.titleStyle === "gradient" ? "text" : undefined,
                        textShadow: settings.titleStyle === "shadow" ? `0 0 30px ${settings.primaryColor}` : undefined,
                      }}
                    >
                      {previewTitle}
                    </h1>

                    {/* Subtitle */}
                    <p
                      className={`text-lg ${
                        availableFonts.find(f => f.value === settings.bodyFont)?.className || "font-sans"
                      }`}
                      style={{ color: settings.primaryColor }}
                    >
                      {previewSubtitle}
                    </p>

                    {/* Description */}
                    <p
                      className={`max-w-md opacity-70 ${
                        availableFonts.find(f => f.value === settings.bodyFont)?.className || "font-sans"
                      }`}
                      style={{ color: settings.darkMode ? settings.textColor : "#1a1a1a" }}
                    >
                      Esta es una vista previa de cómo se verá tu landing page con los estilos seleccionados.
                    </p>

                    {/* Button */}
                    <button
                      type="button"
                      className="px-8 py-3 text-lg font-medium transition-all"
                      style={{
                        background: settings.buttonStyle === "gradient"
                          ? `linear-gradient(to right, ${settings.primaryColor}, ${settings.secondaryColor})`
                          : settings.buttonStyle === "solid"
                          ? settings.primaryColor
                          : settings.buttonStyle === "glass"
                          ? "rgba(255,255,255,0.1)"
                          : "transparent",
                        border: settings.buttonStyle === "outline"
                          ? `2px solid ${settings.primaryColor}`
                          : settings.buttonStyle === "glass"
                          ? "1px solid rgba(255,255,255,0.2)"
                          : "none",
                        backdropFilter: settings.buttonStyle === "glass" ? "blur(10px)" : undefined,
                        borderRadius: settings.buttonRounded === "full" ? "9999px"
                          : settings.buttonRounded === "lg" ? "0.5rem"
                          : settings.buttonRounded === "md" ? "0.375rem"
                          : settings.buttonRounded === "sm" ? "0.25rem"
                          : "0",
                        color: settings.buttonStyle === "outline" ? settings.primaryColor : "white",
                        boxShadow: settings.enableGlow ? `0 10px 30px -5px ${settings.primaryColor}50` : undefined,
                      }}
                    >
                      Descargar Ahora
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview mode label */}
            <div className="p-2 border-t border-slc-border text-center text-xs text-slc-muted">
              {responsiveBreakpoints[previewMode].width} x {responsiveBreakpoints[previewMode].height} px
              {" • "}
              {responsiveBreakpoints[previewMode].label}
            </div>
          </div>
        </div>
      )}

      {/* Save Style Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-slc-dark border border-slc-border rounded-xl w-full max-w-md p-6">
            <h3 className="font-oswald text-lg uppercase mb-4">Guardar Estilo</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slc-muted mb-2">Nombre *</label>
                <Input
                  value={styleName}
                  onChange={(e) => setStyleName(e.target.value)}
                  placeholder="Mi estilo personalizado"
                />
              </div>

              <div>
                <label className="block text-sm text-slc-muted mb-2">Descripción</label>
                <textarea
                  value={styleDescription}
                  onChange={(e) => setStyleDescription(e.target.value)}
                  placeholder="Descripción opcional..."
                  rows={2}
                  className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowSaveModal(false);
                    setStyleName("");
                    setStyleDescription("");
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={saveAsNewStyle}
                  disabled={!styleName.trim() || saving}
                >
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
