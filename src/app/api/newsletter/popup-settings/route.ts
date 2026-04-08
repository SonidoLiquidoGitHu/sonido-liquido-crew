import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { siteSettings } from "@/db/schema";
import { generateUUID } from "@/lib/utils";
import { eq } from "drizzle-orm";

// Default settings
const defaultSettings = {
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

  headline: "Únete al Newsletter",
  subheadline: "Suscríbete y obtén acceso a contenido exclusivo del crew.",
  badgeText: "Contenido Exclusivo",
  buttonText: "Suscribirme Gratis",
  successTitle: "¡Bienvenido al Crew!",
  successMessage: "Revisa tu correo para confirmar tu suscripción y recibir tu contenido exclusivo.",

  abTestEnabled: false,
  variantAHeadline: "",
  variantBHeadline: "",
  variantAButtonText: "",
  variantBButtonText: "",

  popupImageUrl: "https://ext.same-assets.com/1846169302/3422652946.png",

  dismissDays: 7,
};

// GET - Fetch popup settings (public)
export async function GET() {
  try {
    const setting = await db.query.siteSettings.findFirst({
      where: (s, { eq }) => eq(s.key, "newsletter_popup_settings"),
    });

    if (setting && setting.value) {
      try {
        const parsedSettings = JSON.parse(setting.value);
        return NextResponse.json({
          success: true,
          settings: { ...defaultSettings, ...parsedSettings },
        });
      } catch {
        return NextResponse.json({
          success: true,
          settings: defaultSettings,
        });
      }
    }

    return NextResponse.json({
      success: true,
      settings: defaultSettings,
    });
  } catch (error) {
    console.error("Failed to fetch popup settings:", error);
    return NextResponse.json({
      success: true,
      settings: defaultSettings,
    });
  }
}

// POST - Update popup settings (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const settings = {
      delaySeconds: body.delaySeconds ?? defaultSettings.delaySeconds,
      showOnScroll: body.showOnScroll ?? defaultSettings.showOnScroll,
      scrollPercentage: body.scrollPercentage ?? defaultSettings.scrollPercentage,
      exitIntentEnabled: body.exitIntentEnabled ?? defaultSettings.exitIntentEnabled,
      exitIntentDelay: body.exitIntentDelay ?? defaultSettings.exitIntentDelay,
      benefits: body.benefits ?? defaultSettings.benefits,
      headline: body.headline ?? defaultSettings.headline,
      subheadline: body.subheadline ?? defaultSettings.subheadline,
      badgeText: body.badgeText ?? defaultSettings.badgeText,
      buttonText: body.buttonText ?? defaultSettings.buttonText,
      successTitle: body.successTitle ?? defaultSettings.successTitle,
      successMessage: body.successMessage ?? defaultSettings.successMessage,
      abTestEnabled: body.abTestEnabled ?? defaultSettings.abTestEnabled,
      variantAHeadline: body.variantAHeadline ?? defaultSettings.variantAHeadline,
      variantBHeadline: body.variantBHeadline ?? defaultSettings.variantBHeadline,
      variantAButtonText: body.variantAButtonText ?? defaultSettings.variantAButtonText,
      variantBButtonText: body.variantBButtonText ?? defaultSettings.variantBButtonText,
      popupImageUrl: body.popupImageUrl ?? defaultSettings.popupImageUrl,
      dismissDays: body.dismissDays ?? defaultSettings.dismissDays,
    };

    // Check if setting exists
    const existing = await db.query.siteSettings.findFirst({
      where: (s, { eq }) => eq(s.key, "newsletter_popup_settings"),
    });

    if (existing) {
      await db.update(siteSettings)
        .set({
          value: JSON.stringify(settings),
          type: "json",
          updatedAt: new Date(),
        })
        .where(eq(siteSettings.key, "newsletter_popup_settings"));
    } else {
      await db.insert(siteSettings).values({
        id: generateUUID(),
        key: "newsletter_popup_settings",
        value: JSON.stringify(settings),
        type: "json",
        description: "Newsletter popup configuration settings",
      });
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Failed to save popup settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save popup settings" },
      { status: 500 }
    );
  }
}
