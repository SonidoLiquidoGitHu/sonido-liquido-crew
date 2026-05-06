import { NextResponse } from "next/server";

// Build timestamp to force fresh deploys
const BUILD_TIME = "2026-03-26T12:30:00Z";

/**
 * Health check endpoint - shows configuration status
 * Visit: https://sonidoliquido.com/api/health
 */
export async function GET() {
  // Get all environment variables with safe masking
  const dbUrl = process.env.DATABASE_URL || "";
  const dbToken = process.env.DATABASE_AUTH_TOKEN || "";
  const dropboxKey = process.env.DROPBOX_APP_KEY || "";
  const dropboxSecret = process.env.DROPBOX_APP_SECRET || "";
  const spotifyId = process.env.SPOTIFY_CLIENT_ID || "";
  const spotifySecret = process.env.SPOTIFY_CLIENT_SECRET || "";

  // Check if variables look valid (not just set, but properly formatted)
  const dbUrlValid = dbUrl.startsWith("libsql://") && dbUrl.length > 20;
  const dbTokenValid = dbToken.length > 100; // JWT tokens are long
  const dropboxKeyValid = dropboxKey.length === 15 && /^[a-z0-9]+$/.test(dropboxKey);
  const dropboxSecretValid = dropboxSecret.length === 15 && /^[a-z0-9]+$/.test(dropboxSecret);

  // Test database connection
  let dbStatus = "NOT_TESTED";
  let dbError = "";
  let artistCount = 0;

  if (dbUrlValid && dbTokenValid) {
    try {
      const { db, isDatabaseConfigured } = await import("@/db/client");
      const { artists } = await import("@/db/schema");

      if (isDatabaseConfigured()) {
        dbStatus = "CONFIGURED";
        try {
          const result = await db.select().from(artists).limit(1);
          artistCount = result.length > 0 ? 1 : 0;
          dbStatus = "CONNECTED";
        } catch (queryError) {
          dbStatus = "QUERY_FAILED";
          dbError = (queryError as Error).message;
        }
      } else {
        dbStatus = "NOT_CONFIGURED";
      }
    } catch (importError) {
      dbStatus = "IMPORT_FAILED";
      dbError = (importError as Error).message;
    }
  } else {
    dbStatus = "INVALID_CREDENTIALS";
    if (!dbUrlValid) dbError = "DATABASE_URL invalid format";
    if (!dbTokenValid) dbError += (dbError ? ", " : "") + "DATABASE_AUTH_TOKEN invalid";
  }

  // Test Dropbox configuration
  let dropboxStatus = "NOT_CONFIGURED";
  if (dropboxKeyValid && dropboxSecretValid) {
    dropboxStatus = "CREDENTIALS_VALID";
  } else if (dropboxKey || dropboxSecret) {
    dropboxStatus = "CREDENTIALS_INVALID";
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    status: dbStatus === "CONNECTED" ? "healthy" : "unhealthy",

    database: {
      status: dbStatus,
      error: dbError || undefined,
      artistCount,
      credentials: {
        DATABASE_URL: dbUrl
          ? `${dbUrl.substring(0, 30)}... (length: ${dbUrl.length}, valid: ${dbUrlValid})`
          : "❌ NOT SET",
        DATABASE_AUTH_TOKEN: dbToken
          ? `SET (length: ${dbToken.length}, valid: ${dbTokenValid})`
          : "❌ NOT SET",
      },
    },

    dropbox: {
      status: dropboxStatus,
      credentials: {
        DROPBOX_APP_KEY: dropboxKey
          ? `${dropboxKey} (length: ${dropboxKey.length}, valid: ${dropboxKeyValid})`
          : "❌ NOT SET",
        DROPBOX_APP_SECRET: dropboxSecret
          ? `SET (length: ${dropboxSecret.length}, valid: ${dropboxSecretValid})`
          : "❌ NOT SET",
      },
      // Expected values for comparison
      expected: {
        DROPBOX_APP_KEY: "x3rw962t4s1sm13",
        DROPBOX_APP_SECRET: "1e3p8jc0yhjg1r1 (15 characters)",
      },
    },

    spotify: {
      configured: Boolean(spotifyId && spotifySecret),
      usingDefaults: !spotifyId && !spotifySecret,
      credentials: {
        SPOTIFY_CLIENT_ID: spotifyId
          ? `${spotifyId.substring(0, 8)}... (length: ${spotifyId.length})`
          : "Using default: d43c9d6653a241148c6926322b0c9568",
        SPOTIFY_CLIENT_SECRET: spotifySecret
          ? `SET (length: ${spotifySecret.length})`
          : "Using default",
      },
    },

    instructions: {
      step1: "Copy the EXACT values from 'expected' into your Netlify environment variables",
      step2: "Make sure there are NO spaces before or after the values",
      step3: "Trigger a new deploy in Netlify",
      step4: "Visit this endpoint again to verify",
      netlifyDocs: "https://docs.netlify.com/environment-variables/overview/",
    },
  });
}
