// ===========================================
// CATALOGUE JSON API
// ===========================================
// Machine-readable endpoint for AI agents (ChatGPT browsing, Claude,
// Perplexity, custom GPTs, etc.) to query the full Sonido Líquido
// catalogue as structured JSON.
//
// USAGE (for AI agents):
//   GET https://sonidoliquido.com/api/catalogue?key=YOUR_KEY
//   GET https://sonidoliquido.com/api/catalogue  (with header x-catalogo-key: YOUR_KEY)
//
// RESPONSE:
//   200 OK — application/json with shape:
//     {
//       "stats": { ... },
//       "artists": [ ... ],
//       "releases": [ ... ],
//       "videos": [ ... ],
//       "events": [ ... ],
//       "playlists": [ ... ],
//       "beats": [ ... ],
//       "galleryPhotos": [ ... ],
//       "youtubeChannels": [ ... ],
//       "timeline": [ ... ],
//       "meta": { "generatedAt": "...", "source": "sonido-liquido-crew", "version": 1 }
//     }
//
//   404 Not Found — when the key is missing or doesn't match
//                  (we deliberately return 404, not 401, so the endpoint's
//                   very existence is hidden from unauthorized callers)
//
// SECURITY:
//   Set CATALOGO_ACCESS_KEY in your env vars (Netlify dashboard for prod,
//   .env.local for dev). When unset, the gate is disabled and the endpoint
//   is public — this is intentional for local dev only.
//
//   Generate a strong random key with:
//     openssl rand -hex 32
//   and paste it into CATALOGO_ACCESS_KEY.

import { fetchCatalogueData } from "@/lib/catalogue-data";
import { isCatalogueAuthorized } from "@/lib/catalogue-auth";
import { type NextRequest, NextResponse } from "next/server";

// Never cache — always return fresh data so AI agents see latest content
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per IP
const ipHitMap = new Map<string, { count: number; windowStart: number }>();

/**
 * Simple in-memory rate limiter.
 * NOTE: This resets on every serverless cold start, so it's a "soft" limit.
 * For a hard limit, use Upstash Redis or similar. For our use case
 * (AI agents making occasional requests), this is more than enough.
 */
function rateLimit(ip: string): { ok: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = ipHitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    ipHitMap.set(ip, { count: 1, windowStart: now });
    return { ok: true };
  }

  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil(
      (RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)) / 1000,
    );
    return { ok: false, retryAfterSeconds };
  }

  return { ok: true };
}

function getClientIp(req: NextRequest): string {
  // Netlify puts the real client IP in x-forwarded-for
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export async function GET(req: NextRequest) {
  // ---- Token gate (same as /catalogo page) ----
  const queryKey = req.nextUrl.searchParams.get("key");
  const headerKey = req.headers.get("x-catalogo-key");

  if (!isCatalogueAuthorized({ queryKey, headerKey })) {
    // Return 404 to hide endpoint existence
    return new NextResponse(
      JSON.stringify({ error: "Not Found" }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // ---- Rate limit ----
  const ip = getClientIp(req);
  const rl = rateLimit(ip);
  if (!rl.ok) {
    return new NextResponse(
      JSON.stringify({
        error: "Rate limit exceeded",
        retryAfterSeconds: rl.retryAfterSeconds,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rl.retryAfterSeconds || 60),
        },
      },
    );
  }

  // ---- Fetch data ----
  try {
    const data = await fetchCatalogueData();

    // Allow optional `?section=artists` to fetch just one section.
    // Useful for AI agents that only need one type of data and want
    // to minimize response size.
    const section = req.nextUrl.searchParams.get("section");
    if (section && section in data) {
      const sectionData = (data as Record<string, unknown>)[section];
      return NextResponse.json(
        {
          success: true,
          section,
          data: sectionData,
          meta: data.meta,
        },
        {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control":
              "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
            // CORS — allow AI agents from any origin to fetch this
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-catalogo-key",
          },
        },
      );
    }

    // Default: return everything
    return NextResponse.json(
      {
        success: true,
        ...data,
      },
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, x-catalogo-key",
        },
      },
    );
  } catch (err) {
    console.error("[Catalogue API] Error fetching data:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch catalogue data",
        meta: {
          generatedAt: new Date().toISOString(),
          source: "sonido-liquido-crew",
          version: 1,
        },
      },
      { status: 500 },
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-catalogo-key",
      "Access-Control-Max-Age": "86400",
    },
  });
}
