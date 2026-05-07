import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { siteSettings } from "@/db/schema";
import { generateUUID } from "@/lib/utils";
import { eq } from "drizzle-orm";

interface PopupAnalyticsEvent {
  event: "shown" | "closed" | "converted";
  variant: "A" | "B";
  source?: string;
  timestamp: string;
}

interface PopupAnalytics {
  variantA: {
    shown: number;
    closed: number;
    converted: number;
  };
  variantB: {
    shown: number;
    closed: number;
    converted: number;
  };
  bySource: {
    time: { shown: number; converted: number };
    scroll: { shown: number; converted: number };
    "exit-intent": { shown: number; converted: number };
  };
  lastUpdated: string;
}

const defaultAnalytics: PopupAnalytics = {
  variantA: { shown: 0, closed: 0, converted: 0 },
  variantB: { shown: 0, closed: 0, converted: 0 },
  bySource: {
    time: { shown: 0, converted: 0 },
    scroll: { shown: 0, converted: 0 },
    "exit-intent": { shown: 0, converted: 0 },
  },
  lastUpdated: new Date().toISOString(),
};

// GET - Get analytics data (admin)
export async function GET() {
  try {
    const setting = await db.query.siteSettings.findFirst({
      where: (s, { eq }) => eq(s.key, "newsletter_popup_analytics"),
    });

    if (setting && setting.value) {
      try {
        const analytics = JSON.parse(setting.value) as PopupAnalytics;

        // Calculate conversion rates
        const variantARate = analytics.variantA.shown > 0
          ? ((analytics.variantA.converted / analytics.variantA.shown) * 100).toFixed(2)
          : "0.00";
        const variantBRate = analytics.variantB.shown > 0
          ? ((analytics.variantB.converted / analytics.variantB.shown) * 100).toFixed(2)
          : "0.00";

        return NextResponse.json({
          success: true,
          analytics: {
            ...analytics,
            conversionRates: {
              variantA: variantARate,
              variantB: variantBRate,
            },
          },
        });
      } catch {
        return NextResponse.json({
          success: true,
          analytics: {
            ...defaultAnalytics,
            conversionRates: { variantA: "0.00", variantB: "0.00" },
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      analytics: {
        ...defaultAnalytics,
        conversionRates: { variantA: "0.00", variantB: "0.00" },
      },
    });
  } catch (error) {
    console.error("Failed to fetch popup analytics:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

// POST - Track analytics event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as PopupAnalyticsEvent;

    // Get current analytics
    const setting = await db.query.siteSettings.findFirst({
      where: (s, { eq }) => eq(s.key, "newsletter_popup_analytics"),
    });

    let analytics: PopupAnalytics = defaultAnalytics;

    if (setting && setting.value) {
      try {
        analytics = JSON.parse(setting.value);
      } catch {
        // Use default analytics
      }
    }

    // Update analytics based on event
    const variantKey = body.variant === "A" ? "variantA" : "variantB";

    switch (body.event) {
      case "shown":
        analytics[variantKey].shown++;
        if (body.source && (body.source === "time" || body.source === "scroll" || body.source === "exit-intent")) {
          analytics.bySource[body.source].shown++;
        }
        break;
      case "closed":
        analytics[variantKey].closed++;
        break;
      case "converted":
        analytics[variantKey].converted++;
        if (body.source && (body.source === "time" || body.source === "scroll" || body.source === "exit-intent")) {
          analytics.bySource[body.source].converted++;
        }
        break;
    }

    analytics.lastUpdated = new Date().toISOString();

    // Save analytics
    if (setting) {
      await db.update(siteSettings)
        .set({
          value: JSON.stringify(analytics),
          updatedAt: new Date(),
        })
        .where(eq(siteSettings.key, "newsletter_popup_analytics"));
    } else {
      await db.insert(siteSettings).values({
        id: generateUUID(),
        key: "newsletter_popup_analytics",
        value: JSON.stringify(analytics),
        type: "json",
        description: "Newsletter popup A/B test analytics",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to track popup event:", error);
    return NextResponse.json(
      { success: false, error: "Failed to track event" },
      { status: 500 }
    );
  }
}

// DELETE - Reset analytics (admin)
export async function DELETE() {
  try {
    const existing = await db.query.siteSettings.findFirst({
      where: (s, { eq }) => eq(s.key, "newsletter_popup_analytics"),
    });

    if (existing) {
      await db.update(siteSettings)
        .set({
          value: JSON.stringify(defaultAnalytics),
          updatedAt: new Date(),
        })
        .where(eq(siteSettings.key, "newsletter_popup_analytics"));
    }

    return NextResponse.json({ success: true, message: "Analytics reset successfully" });
  } catch (error) {
    console.error("Failed to reset analytics:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset analytics" },
      { status: 500 }
    );
  }
}
