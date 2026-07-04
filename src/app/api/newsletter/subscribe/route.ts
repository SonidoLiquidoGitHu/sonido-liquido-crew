import { db } from "@/db/client";
import { siteSettings } from "@/db/schema";
import { subscribersService } from "@/lib/services";
import { VALID_SUBSCRIPTION_SOURCES, subscribeSchema } from "@/lib/validations";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

// Rate limiting: track IPs in memory (resets on serverless cold start, but effective)
const submitAttempts = new Map<
  string,
  { count: number; firstAttempt: number }
>();
const MAX_ATTEMPTS = 5; // Max 5 subscriptions per IP per window
const WINDOW_MS = 60 * 60 * 1000; // 1 hour window

// Known spam/bot email domains
const SPAM_DOMAINS = [
  "chameleongroup.co",
  "a7g.ru",
  "mailinator.com",
  "guerrillamail.com",
  "sharklasers.com",
  "guerrillamailblock.com",
  "grr.la",
  "dispostable.com",
  "trashmail.com",
  "tempmail.com",
  "throwaway.email",
];

function isSpamEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return true;

  // Check against known spam domains
  if (SPAM_DOMAINS.includes(domain)) return true;

  // Check for obfuscated email patterns (lots of dots = likely bot)
  // e.g. cuf.o.s.i.m.u.d.36.3@gmail.com, s.u.z.a.n.n.e.fami.co.u.s.e.l.i@gmail.com
  const localPart = email.split("@")[0];
  const dotCount = (localPart.match(/\./g) || []).length;
  if (dotCount >= 4) return true; // Normal emails rarely have 4+ dots in local part

  return false;
}

function isBotName(name: string | null | undefined): boolean {
  if (!name) return false;
  // Random gibberish names: mix of upper/lowercase, no vowels pattern, long
  // e.g. miLWRVDMYOEsiHjTegVQz, cLpLcyOcGcuDisJaqPvqd
  if (name.length >= 15 && /^[a-zA-Z]+$/.test(name)) {
    // Count consonant clusters (4+ consecutive consonants = likely random)
    const consonantClusters = name.match(/[^aeiouAEIOU]{4,}/g);
    if (consonantClusters && consonantClusters.length >= 2) return true;
  }
  return false;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);

    // Rate limiting
    const now = Date.now();
    const attempts = submitAttempts.get(clientIp);
    if (attempts) {
      if (now - attempts.firstAttempt > WINDOW_MS) {
        // Reset window
        submitAttempts.set(clientIp, { count: 1, firstAttempt: now });
      } else if (attempts.count >= MAX_ATTEMPTS) {
        return NextResponse.json(
          { success: false, error: "Demasiados intentos. Intenta más tarde." },
          { status: 429 },
        );
      } else {
        attempts.count++;
      }
    } else {
      submitAttempts.set(clientIp, { count: 1, firstAttempt: now });
    }

    // Clean up old entries periodically (keep map from growing unbounded)
    if (submitAttempts.size > 1000) {
      for (const [ip, data] of submitAttempts) {
        if (now - data.firstAttempt > WINDOW_MS) {
          submitAttempts.delete(ip);
        }
      }
    }

    const body = await request.json();

    // Validate input
    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { email, name, source, website } = parsed.data;

    // Honeypot check: if the hidden "website" field is filled, it's a bot
    if (website && website.length > 0) {
      // Silently accept but don't actually subscribe (bots think they succeeded)
      return NextResponse.json({
        success: true,
        message: "Successfully subscribed to newsletter",
        data: { email, subscribedAt: new Date() },
      });
    }

    // Spam email detection
    if (isSpamEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Email no válido." },
        { status: 400 },
      );
    }

    // Bot name detection
    if (isBotName(name)) {
      return NextResponse.json(
        { success: false, error: "Nombre no válido." },
        { status: 400 },
      );
    }

    // Source validation: only accept known valid sources
    let validatedSource = source || "website";
    if (!VALID_SUBSCRIPTION_SOURCES.includes(validatedSource as any)) {
      // Check if it starts with a known prefix (like "popup_" or "download-gate:")
      const isKnownPrefix = VALID_SUBSCRIPTION_SOURCES.some(
        (valid) =>
          validatedSource.startsWith(`${valid}:`) ||
          validatedSource.startsWith(`${valid}_`),
      );
      if (!isKnownPrefix) {
        // Unknown source — default to "website" instead of accepting arbitrary values
        console.warn(
          `[Newsletter] Rejected source "${validatedSource}" from ${email}, defaulting to "website"`,
        );
        validatedSource = "website";
      }
    }

    // Subscribe
    const subscriber = await subscribersService.subscribe(
      email,
      name || undefined,
      validatedSource,
    );

    // Fetch download file settings to return on successful subscription
    let downloadFile: {
      url: string;
      name: string;
      buttonText: string;
      description: string;
    } | null = null;
    try {
      const setting = await db.query.siteSettings.findFirst({
        where: (s, { eq }) => eq(s.key, "newsletter_popup_settings"),
      });

      if (setting?.value) {
        const popupSettings = JSON.parse(setting.value);
        if (
          popupSettings.downloadFileEnabled &&
          popupSettings.downloadFileUrl
        ) {
          downloadFile = {
            url: popupSettings.downloadFileUrl,
            name: popupSettings.downloadFileName || "Regalo exclusivo",
            buttonText: popupSettings.downloadButtonText || "Descargar Regalo",
            description: popupSettings.downloadDescription || "",
          };
        }
      }
    } catch (e) {
      // Non-critical — don't fail the subscription if this lookup fails
      console.error("Failed to fetch download file settings:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Successfully subscribed to newsletter",
      data: {
        email: subscriber.email,
        subscribedAt: subscriber.subscribedAt,
        downloadFile,
      },
    });
  } catch (error) {
    console.error("Error subscribing:", error);
    return NextResponse.json(
      { success: false, error: "Failed to subscribe" },
      { status: 500 },
    );
  }
}
