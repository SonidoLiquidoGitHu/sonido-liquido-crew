import { subscribersService } from "@/lib/services";
import { subscribeSchema } from "@/lib/validations";
import { type NextRequest, NextResponse } from "next/server";

// ===========================================
// Sampling Resources Access Endpoint
// ===========================================
// Collects an email before granting access to the internal
// sampling-resources landing page. Stores the email in the
// subscribers table with source = "sampling-resources" so it
// flows through the same pipeline (Mailchimp sync, etc).

// Rate limiting: track IPs in memory (resets on serverless cold start)
const submitAttempts = new Map<
  string,
  { count: number; firstAttempt: number }
>();
const MAX_ATTEMPTS = 10; // Max 10 attempts per IP per window
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

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
  if (SPAM_DOMAINS.includes(domain)) return true;

  // Obfuscated email patterns (lots of dots in local part = likely bot)
  const localPart = email.split("@")[0];
  const dotCount = (localPart.match(/\./g) || []).length;
  if (dotCount >= 4) return true;

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

    // Cleanup old entries
    if (submitAttempts.size > 1000) {
      for (const [ip, data] of submitAttempts) {
        if (now - data.firstAttempt > WINDOW_MS) {
          submitAttempts.delete(ip);
        }
      }
    }

    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Email no válido.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { email, name, website } = parsed.data;

    // Honeypot: if hidden website field is filled, it's a bot
    if (website && website.trim().length > 0) {
      // Pretend success so bots think they won
      return NextResponse.json({
        success: true,
        message: "Access granted",
        data: { email, grantedAt: new Date().toISOString() },
      });
    }

    if (isSpamEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Email no válido." },
        { status: 400 },
      );
    }

    // Subscribe with the dedicated source and Mailchimp tag
    try {
      await subscribersService.subscribe(
        email,
        name || undefined,
        "sampling-resources",
      );
    } catch (err) {
      // If it's a duplicate-email error, that's fine — they're already on the list.
      // Log but don't fail the request, since we still want to grant access.
      console.warn(
        "[sampling-resources] subscribe() returned an error (likely duplicate):",
        err,
      );
    }

    // Ensure the "sampling-resources" tag is applied in Mailchimp for segmentation
    try {
      const { mailchimpClient } = await import("@/lib/clients");
      if (mailchimpClient.isConfigured()) {
        await mailchimpClient.addTagsToMember(email, ["sampling-resources"]);
        console.log(
          `[sampling-resources] Applied "sampling-resources" Mailchimp tag to ${email.substring(0, 3)}***`,
        );
      }
    } catch (tagErr) {
      // Non-critical: subscriber is already in Mailchimp, just the tag failed
      console.warn(
        "[sampling-resources] Failed to apply Mailchimp tag:",
        tagErr,
      );
    }

    return NextResponse.json({
      success: true,
      message: "Access granted",
      data: {
        email,
        grantedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error in sampling-resources access endpoint:", error);
    return NextResponse.json(
      { success: false, error: "Error al procesar la solicitud." },
      { status: 500 },
    );
  }
}
