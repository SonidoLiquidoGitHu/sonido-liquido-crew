import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { artists } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * One-time fix: Clean up double-escaped JSON in artist fields.
 *
 * Some older data was saved with extra layers of JSON.stringify(), resulting in
 * values like '"[\\"quote\\"]"' instead of '["quote"]'. This endpoint finds and
 * fixes those values so that future reads produce proper arrays/objects on the
 * first JSON.parse().
 *
 * Affected fields: genres, labels, pressQuotes, featuredVideos
 */
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const allArtists = await db.select().from(artists);
    const fixed: string[] = [];

    for (const artist of allArtists) {
      const updates: Record<string, unknown> = {};
      let needsUpdate = false;

      // Check each JSON field for double-escaping
      const jsonFields = ["genres", "labels", "pressQuotes", "featuredVideos"] as const;

      for (const field of jsonFields) {
        const raw = (artist as any)[field];
        if (!raw || typeof raw !== "string") continue;

        const fixedValue = unwrapDoubleEscaped(raw);
        if (fixedValue !== raw) {
          updates[field] = fixedValue;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        updates.updatedAt = new Date();
        await db.update(artists).set(updates).where(eq(artists.id, artist.id));
        fixed.push(`${artist.name}: ${Object.keys(updates).filter(k => k !== 'updatedAt').join(", ")}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixed.length} artists`,
      details: fixed,
    });
  } catch (error) {
    console.error("[API] Error fixing double-escaped JSON:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fix data" },
      { status: 500 }
    );
  }
}

/**
 * Parse a potentially double-escaped JSON string and return the clean version.
 * If the string parses to another string, keep parsing until we get a non-string.
 * Then re-stringify once to get a properly single-encoded value.
 */
function unwrapDoubleEscaped(value: string): string {
  try {
    let parsed: unknown = JSON.parse(value);
    let depth = 0;

    // Keep unwrapping while the result is a string (double-escaped)
    while (typeof parsed === "string" && depth < 5) {
      try {
        const next = JSON.parse(parsed);
        parsed = next;
        depth++;
      } catch {
        break;
      }
    }

    // If we unwrapped at least one layer, re-stringify once for proper storage
    if (depth > 0) {
      return JSON.stringify(parsed);
    }

    // No unwrapping needed — value was already correctly encoded
    return value;
  } catch {
    // Can't parse at all — leave as-is
    return value;
  }
}
