"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Gift, Music, Calendar, Download, Loader2, CheckCircle, Sparkles, Headphones, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSoundEffects } from "./effects/SoundEffects";

// Default popup configuration
interface PopupSettings {
  // Timing
  delaySeconds: number;
  showOnScroll: boolean;
  scrollPercentage: number;
  exitIntentEnabled: boolean;
  exitIntentDelay: number; // Delay before exit intent activates (ms)

  // Benefits
  benefits: {
    icon: string;
    title: string;
    color: string;
    imageUrl?: string;
  }[];

  // Content
  headline: string;
  subheadline: string;
  badgeText: string;
  buttonText: string;
  successTitle: string;
  successMessage: string;

  // A/B Testing
  abTestEnabled: boolean;
  abTestVariant?: "A" | "B";
  variantAHeadline?: string;
  variantBHeadline?: string;
  variantAButtonText?: string;
  variantBButtonText?: string;

  // Popup image
  popupImageUrl: string;

  // Dismissal
  dismissDays: number;
}

const defaultSettings: PopupSettings = {
  delaySeconds: 8,
  showOnScroll: true,
  scrollPercentage: 50,
  exitIntentEnabled: true,
  exitIntentDelay: 2000,

  benefits: [
    { icon: "download", title: "Descargas exclusivas", color: "primary" },
    { icon: "music", title: "Adelantos de releases", color: "green-500" },
    { icon: "calendar", title: "Info de eventos", color: "cyan-500" },
  ],

  headline: "¡APÚNTATE!",
  subheadline: "Suscríbete y obtén acceso a contenido exclusivo del crew.",
  badgeText: "Contenido Exclusivo",
  buttonText: "Suscribirme Gratis",
  successTitle: "¡Bienvenido al Crew!",
  successMessage: "Revisa tu correo para confirmar tu suscripción y recibir tu contenido exclusivo.",

  abTestEnabled: false,

  // Use empty string - no image by default to avoid broken images
  popupImageUrl: "",

  dismissDays: 7,
};

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
  download: <Download className="w-5 h-5" />,
  music: <Music className="w-5 h-5" />,
  calendar: <Calendar className="w-5 h-5" />,
  gift: <Gift className="w-5 h-5" />,
  sparkles: <Sparkles className="w-5 h-5" />,
  headphones: <Headphones className="w-5 h-5" />,
  star: <Star className="w-5 h-5" />,
};

// Color mapping
const colorMap: Record<string, string> = {
  "primary": "text-primary",
  "green-500": "text-green-500",
  "cyan-500": "text-cyan-500",
  "yellow-500": "text-yellow-500",
  "red-500": "text-red-500",
  "purple-500": "text-purple-500",
  "pink-500": "text-pink-500",
};

interface NewsletterPopupProps {
  delaySeconds?: number;
  showOnScroll?: boolean;
  scrollPercentage?: number;
}

export function NewsletterPopup({
  delaySeconds,
  showOnScroll,
  scrollPercentage,
}: NewsletterPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [hasShown, setHasShown] = useState(false);
  const [settings, setSettings] = useState<PopupSettings>(defaultSettings);
  const [abVariant, setAbVariant] = useState<"A" | "B">("A");
  const [triggerSource, setTriggerSource] = useState<"time" | "scroll" | "exit-intent">("time");
  const { playSound } = useSoundEffects();
  const exitIntentEnabled = useRef(false);

  // Fetch settings from API
  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch("/api/newsletter/popup-settings");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.settings) {
            setSettings(prev => ({ ...prev, ...data.settings }));

            // Apply prop overrides
            if (delaySeconds !== undefined) {
              setSettings(prev => ({ ...prev, delaySeconds }));
            }
            if (showOnScroll !== undefined) {
              setSettings(prev => ({ ...prev, showOnScroll }));
            }
            if (scrollPercentage !== undefined) {
              setSettings(prev => ({ ...prev, scrollPercentage }));
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch popup settings:", error);
      }
    }
    fetchSettings();
  }, [delaySeconds, showOnScroll, scrollPercentage]);

  // Determine A/B test variant
  useEffect(() => {
    if (settings.abTestEnabled) {
      // Check if user already has a variant assigned
      const storedVariant = localStorage.getItem("newsletter_ab_variant");
      if (storedVariant === "A" || storedVariant === "B") {
        setAbVariant(storedVariant);
      } else {
        // Randomly assign variant
        const variant = Math.random() < 0.5 ? "A" : "B";
        localStorage.setItem("newsletter_ab_variant", variant);
        setAbVariant(variant);
      }
    }
  }, [settings.abTestEnabled]);

  // Check if popup was already dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem("newsletter_popup_dismissed");
    const subscribed = localStorage.getItem("newsletter_subscribed");

    if (subscribed) {
      setHasShown(true);
      return;
    }

    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const dismissDays = settings.dismissDays || 7;
      const expiryTime = dismissedTime + (dismissDays * 24 * 60 * 60 * 1000);

      if (Date.now() < expiryTime) {
        setHasShown(true);
      } else {
        // Dismissal expired, clear it
        localStorage.removeItem("newsletter_popup_dismissed");
      }
    }
  }, [settings.dismissDays]);

  // Track A/B test events
  const trackPopupEvent = useCallback(async (event: string, source?: string) => {
    try {
      await fetch("/api/newsletter/popup-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event,
          variant: abVariant,
          source,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error("Failed to track popup event:", error);
    }
  }, [abVariant]);

  // Show popup trigger
  const showPopup = useCallback((source: "time" | "scroll" | "exit-intent") => {
    if (!hasShown) {
      setIsOpen(true);
      setHasShown(true);
      setTriggerSource(source);
      playSound("success");

      // Track popup shown for A/B testing
      if (settings.abTestEnabled) {
        trackPopupEvent("shown", source);
      }
    }
  }, [hasShown, playSound, settings.abTestEnabled, trackPopupEvent]);

  // Time-based and scroll-based triggers
  useEffect(() => {
    if (hasShown) return;

    let timeoutId: NodeJS.Timeout;
    let scrollHandler: (() => void) | null = null;

    // Time-based trigger
    timeoutId = setTimeout(() => {
      showPopup("time");
    }, settings.delaySeconds * 1000);

    // Scroll-based trigger
    if (settings.showOnScroll) {
      scrollHandler = () => {
        const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        if (scrolled >= settings.scrollPercentage && !hasShown) {
          showPopup("scroll");
          if (scrollHandler) {
            window.removeEventListener("scroll", scrollHandler);
          }
        }
      };
      window.addEventListener("scroll", scrollHandler);
    }

    return () => {
      clearTimeout(timeoutId);
      if (scrollHandler) {
        window.removeEventListener("scroll", scrollHandler);
      }
    };
  }, [settings.delaySeconds, settings.showOnScroll, settings.scrollPercentage, hasShown, showPopup]);

  // Exit-intent trigger
  useEffect(() => {
    if (!settings.exitIntentEnabled || hasShown) return;

    // Enable exit intent after delay
    const enableTimeout = setTimeout(() => {
      exitIntentEnabled.current = true;
    }, settings.exitIntentDelay);

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger if mouse leaves through the top of the viewport
      if (
        exitIntentEnabled.current &&
        e.clientY <= 0 &&
        !hasShown
      ) {
        showPopup("exit-intent");
      }
    };

    // For mobile: detect rapid scroll up (similar to "leaving" behavior)
    let lastScrollY = window.scrollY;
    let scrollVelocity = 0;
    const handleScroll = () => {
      if (!exitIntentEnabled.current || hasShown) return;

      const currentScrollY = window.scrollY;
      scrollVelocity = lastScrollY - currentScrollY;
      lastScrollY = currentScrollY;

      // If user rapidly scrolls up at the top of the page
      if (currentScrollY < 100 && scrollVelocity > 50) {
        showPopup("exit-intent");
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("scroll", handleScroll);

    return () => {
      clearTimeout(enableTimeout);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [settings.exitIntentEnabled, settings.exitIntentDelay, hasShown, showPopup]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    playSound("click");
    // Remember dismissal
    localStorage.setItem("newsletter_popup_dismissed", Date.now().toString());

    // Track close event
    if (settings.abTestEnabled) {
      trackPopupEvent("closed");
    }
  }, [playSound, settings.abTestEnabled, trackPopupEvent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === "loading") return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: `popup_${triggerSource}`,
          abVariant: settings.abTestEnabled ? abVariant : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus("success");
        playSound("success");
        localStorage.setItem("newsletter_subscribed", "true");

        // Track conversion for A/B testing
        if (settings.abTestEnabled) {
          trackPopupEvent("converted");
        }

        // Close after 3 seconds on success
        setTimeout(() => {
          setIsOpen(false);
        }, 3000);
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Error al suscribirse");
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage("Error de conexión. Intenta de nuevo.");
    }
  };

  // Get display text based on A/B variant
  const getHeadline = () => {
    if (settings.abTestEnabled && abVariant === "B" && settings.variantBHeadline) {
      return settings.variantBHeadline;
    }
    if (settings.abTestEnabled && abVariant === "A" && settings.variantAHeadline) {
      return settings.variantAHeadline;
    }
    return settings.headline;
  };

  const getButtonText = () => {
    if (settings.abTestEnabled && abVariant === "B" && settings.variantBButtonText) {
      return settings.variantBButtonText;
    }
    if (settings.abTestEnabled && abVariant === "A" && settings.variantAButtonText) {
      return settings.variantAButtonText;
    }
    return settings.buttonText;
  };

  // State for image error
  const [imageError, setImageError] = useState(false);

  // Check if we should show the image
  const shouldShowImage = settings.popupImageUrl && settings.popupImageUrl.trim() !== "" && !imageError;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] animate-in fade-in duration-300"
        onClick={handleClose}
      />

      {/* Popup */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative w-full max-w-lg bg-gradient-to-br from-slc-dark via-slc-card to-slc-dark border border-slc-border rounded-2xl shadow-2xl pointer-events-auto animate-in zoom-in-95 fade-in duration-300"
          style={{
            boxShadow: "0 0 60px rgba(249, 115, 22, 0.2), 0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slc-card/80 border border-slc-border text-slc-muted hover:text-white hover:bg-slc-card hover:border-primary/50 transition-all z-10"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Content */}
          <div className="p-6 sm:p-8">
            {/* Popup Image or Icon */}
            <div className="flex justify-center mb-4">
              {shouldShowImage ? (
                <div className="w-32 h-32 sm:w-40 sm:h-40 animate-bounce" style={{ animationDuration: "2s" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={settings.popupImageUrl}
                    alt="Newsletter"
                    className="w-full h-full object-contain drop-shadow-2xl"
                    onError={() => setImageError(true)}
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center animate-pulse">
                  <Gift className="w-10 h-10 text-primary" />
                </div>
              )}
            </div>

            {status === "success" ? (
              // Success state
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="font-oswald text-2xl uppercase text-white mb-2">
                  {settings.successTitle}
                </h3>
                <p className="text-slc-muted">
                  {settings.successMessage}
                </p>
              </div>
            ) : (
              // Form state
              <>
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mb-3">
                    <Gift className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium uppercase tracking-wider text-primary">
                      {settings.badgeText}
                    </span>
                  </div>
                  <h2 className="font-oswald text-2xl sm:text-3xl uppercase tracking-wide text-white mb-2">
                    {getHeadline().includes("Newsletter") ? (
                      <>
                        {getHeadline().split("Newsletter")[0]}
                        <span className="text-primary">Newsletter</span>
                        {getHeadline().split("Newsletter")[1]}
                      </>
                    ) : (
                      getHeadline()
                    )}
                  </h2>
                  <p className="text-slc-muted text-sm sm:text-base">
                    {settings.subheadline}
                  </p>
                </div>

                {/* Benefits */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  {settings.benefits.map((benefit, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 bg-slc-card/50 rounded-lg border border-slc-border/50"
                    >
                      {benefit.imageUrl ? (
                        // Custom image for benefit
                        <div className="w-8 h-8 rounded overflow-hidden shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={benefit.imageUrl}
                            alt={benefit.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        // Icon
                        <span className={`shrink-0 ${colorMap[benefit.color] || "text-primary"}`}>
                          {iconMap[benefit.icon] || <Gift className="w-5 h-5" />}
                        </span>
                      )}
                      <span className="text-xs text-slc-muted">{benefit.title}</span>
                    </div>
                  ))}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      required
                      disabled={status === "loading"}
                      className="w-full h-12 px-4 bg-slc-dark border-slc-border focus:border-primary text-white placeholder:text-slc-muted rounded-xl"
                    />
                  </div>

                  {errorMessage && (
                    <p className="text-red-500 text-sm text-center">{errorMessage}</p>
                  )}

                  <Button
                    type="submit"
                    disabled={status === "loading" || !email}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(249,115,22,0.4)]"
                  >
                    {status === "loading" ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Suscribiendo...
                      </>
                    ) : (
                      getButtonText()
                    )}
                  </Button>

                  <p className="text-xs text-center text-slc-muted">
                    Sin spam. Puedes darte de baja cuando quieras.
                  </p>
                </form>
              </>
            )}
          </div>

          {/* A/B Test indicator (only in development) */}
          {process.env.NODE_ENV === "development" && settings.abTestEnabled && (
            <div className="absolute bottom-2 left-2 text-[10px] text-slc-muted/50 font-mono">
              Variant: {abVariant} | Trigger: {triggerSource}
            </div>
          )}

          {/* Decorative elements */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>
      </div>
    </>
  );
}
