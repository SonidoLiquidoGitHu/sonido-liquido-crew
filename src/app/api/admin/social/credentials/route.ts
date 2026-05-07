// ===========================================
// ADMIN API: SOCIAL CREDENTIALS
// GET  — Retrieve all credentials (values masked for security)
// PUT  — Save/update credentials
// ===========================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { socialCredentials } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { invalidateMetaCredentialsCache } from "@/lib/clients/meta";
import { invalidateTikTokCredentialsCache } from "@/lib/clients/tiktok";

export const dynamic = "force-dynamic";

// ===========================================
// CREDENTIAL KEY DEFINITIONS
// ===========================================

const META_KEYS = [
  "META_APP_ID",
  "META_APP_SECRET",
  "META_SYSTEM_USER_TOKEN",
  "FACEBOOK_PAGE_ID",
] as const;

const TIKTOK_KEYS = [
  "TIKTOK_CLIENT_KEY",
  "TIKTOK_CLIENT_SECRET",
  "TIKTOK_ACCESS_TOKEN",
  "TIKTOK_REFRESH_TOKEN",
  "TIKTOK_OPEN_ID",
] as const;

const ALL_KEYS = [...META_KEYS, ...TIKTOK_KEYS] as const;

type CredentialKey = (typeof ALL_KEYS)[number];

function getPlatformForKey(key: string): "meta" | "tiktok" {
  if (key.startsWith("META_") || key.startsWith("FACEBOOK_")) return "meta";
  if (key.startsWith("TIKTOK_")) return "tiktok";
  return "meta"; // default
}

/**
 * Mask a credential value for display.
 * Shows first 4 and last 4 chars, masks the middle.
 */
function maskValue(value: string): string {
  if (!value) return "";
  if (value.length <= 12) return "••••••••";
  return value.substring(0, 4) + "••••••••" + value.substring(value.length - 4);
}

// ===========================================
// GET — Retrieve all credentials (masked)
// ===========================================

export async function GET(request: NextRequest) {
  try {
    // Fetch all credentials from DB
    const dbCredentials = await db.select().from(socialCredentials);

    // Build a map of key -> { value, source }
    const credentialMap: Record<
      string,
      {
        maskedValue: string;
        hasValue: boolean;
        source: "db" | "env" | "none";
      }
    > = {};

    for (const key of ALL_KEYS) {
      const platform = getPlatformForKey(key);
      const dbEntry = dbCredentials.find(
        (c) => c.platform === platform && c.key === key
      );
      const envValue = process.env[key];

      if (dbEntry && dbEntry.value) {
        // DB value takes priority
        credentialMap[key] = {
          maskedValue: maskValue(dbEntry.value),
          hasValue: true,
          source: "db",
        };
      } else if (envValue) {
        // Fall back to env var
        credentialMap[key] = {
          maskedValue: maskValue(envValue),
          hasValue: true,
          source: "env",
        };
      } else {
        credentialMap[key] = {
          maskedValue: "",
          hasValue: false,
          source: "none",
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        credentials: credentialMap,
        metaKeys: META_KEYS,
        tiktokKeys: TIKTOK_KEYS,
      },
    });
  } catch (error) {
    console.error("[Credentials API] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch credentials" },
      { status: 500 }
    );
  }
}

// ===========================================
// PUT — Save credentials
// ===========================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { credentials } = body as { credentials: Record<string, string> };

    if (!credentials || typeof credentials !== "object") {
      return NextResponse.json(
        { success: false, error: "credentials object is required" },
        { status: 400 }
      );
    }

    const results: { key: string; saved: boolean }[] = [];

    for (const [key, value] of Object.entries(credentials)) {
      // Validate key is allowed
      if (!ALL_KEYS.includes(key as CredentialKey)) {
        console.warn(`[Credentials API] Skipping unknown key: ${key}`);
        continue;
      }

      const platform = getPlatformForKey(key);

      // Check if credential already exists
      const existing = await db
        .select()
        .from(socialCredentials)
        .where(
          and(
            eq(socialCredentials.platform, platform),
            eq(socialCredentials.key, key)
          )
        )
        .limit(1);

      if (value === "" || value === null || value === undefined) {
        // If empty value, delete the credential from DB (revert to env var)
        if (existing.length > 0) {
          await db
            .delete(socialCredentials)
            .where(eq(socialCredentials.id, existing[0].id));
        }
        results.push({ key, saved: true });
      } else if (existing.length > 0) {
        // Update existing
        await db
          .update(socialCredentials)
          .set({
            value,
            isFromUi: true,
            updatedAt: new Date(),
          })
          .where(eq(socialCredentials.id, existing[0].id));
        results.push({ key, saved: true });
      } else {
        // Insert new
        await db.insert(socialCredentials).values({
          id: crypto.randomUUID(),
          platform,
          key,
          value,
          isFromUi: true,
        });
        results.push({ key, saved: true });
      }
    }

    // Invalidate credential caches so the next API call picks up the new values
    invalidateMetaCredentialsCache();
    invalidateTikTokCredentialsCache();

    return NextResponse.json({
      success: true,
      message: `Se guardaron ${results.filter((r) => r.saved).length} credenciales.`,
      data: results,
    });
  } catch (error) {
    console.error("[Credentials API] PUT error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save credentials" },
      { status: 500 }
    );
  }
}
