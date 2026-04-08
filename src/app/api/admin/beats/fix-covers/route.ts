import { NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { beats, siteSettings } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

const DROPBOX_BASE_URL = "https://api.dropboxapi.com/2";

interface FixResult {
  id: string;
  title: string;
  oldUrl: string;
  newUrl: string | null;
  status: "fixed" | "not_found" | "error" | "ok" | "not_dropbox";
}

// Helper functions
function isDropboxUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("dropboxusercontent.com") || url.includes("dropbox.com");
}

function isBrokenDropboxUrl(url: string): boolean {
  if (!isDropboxUrl(url)) return false;
  return !url.includes("rlkey=");
}

function extractFilename(url: string): string | null {
  const match = url.match(/\/([^/?]+)(?:\?|$)/);
  return match ? match[1] : null;
}

function convertToDirectLink(url: string): string {
  let directUrl = url.replace("www.dropbox.com", "dl.dropboxusercontent.com");

  const rlkeyMatch = url.match(/[?&]rlkey=([^&]+)/);
  const rlkey = rlkeyMatch ? rlkeyMatch[1] : null;

  const stMatch = url.match(/[?&]st=([^&]+)/);
  const st = stMatch ? stMatch[1] : null;

  directUrl = directUrl.split("?")[0];

  const params: string[] = [];
  if (rlkey) params.push(`rlkey=${rlkey}`);
  if (st) params.push(`st=${st}`);
  params.push("dl=1");

  if (params.length > 0) {
    directUrl += "?" + params.join("&");
  }

  return directUrl;
}

async function getAccessToken(): Promise<string | null> {
  try {
    const tokenResults = await db
      .select()
      .from(siteSettings)
      .where(inArray(siteSettings.key, ["dropbox_access_token"]));

    const tokenRow = tokenResults.find(r => r.key === "dropbox_access_token");
    return tokenRow?.value || null;
  } catch {
    return null;
  }
}

async function findFileByName(token: string, filename: string): Promise<string | null> {
  try {
    const response = await fetch(`${DROPBOX_BASE_URL}/files/search_v2`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: filename,
        options: { max_results: 10, filename_only: true },
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const matches = data.matches || [];

    for (const match of matches) {
      const metadata = match.metadata?.metadata;
      if (metadata?.name === filename) {
        return metadata.path_display || metadata.path_lower;
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function getSharedLinkFromPath(token: string, path: string): Promise<string | null> {
  try {
    // First try to get existing links
    const listResponse = await fetch(`${DROPBOX_BASE_URL}/sharing/list_shared_links`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path, direct_only: true }),
    });

    if (listResponse.ok) {
      const data = await listResponse.json();
      if (data.links && data.links.length > 0) {
        return convertToDirectLink(data.links[0].url);
      }
    }

    // If no existing link, create a new one
    const createResponse = await fetch(`${DROPBOX_BASE_URL}/sharing/create_shared_link_with_settings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path,
        settings: { access: "viewer", audience: "public", requested_visibility: "public" },
      }),
    });

    if (createResponse.ok) {
      const data = await createResponse.json();
      return convertToDirectLink(data.url);
    }

    return null;
  } catch {
    return null;
  }
}

// GET - Check beat covers
export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
  }

  try {
    const allBeats = await db.select({
      id: beats.id,
      title: beats.title,
      coverImageUrl: beats.coverImageUrl,
    }).from(beats);

    const results: FixResult[] = [];

    for (const beat of allBeats) {
      if (!beat.coverImageUrl) {
        results.push({
          id: beat.id,
          title: beat.title,
          oldUrl: "",
          newUrl: null,
          status: "not_found",
        });
      } else if (!isDropboxUrl(beat.coverImageUrl)) {
        results.push({
          id: beat.id,
          title: beat.title,
          oldUrl: beat.coverImageUrl,
          newUrl: null,
          status: "not_dropbox",
        });
      } else if (isBrokenDropboxUrl(beat.coverImageUrl)) {
        results.push({
          id: beat.id,
          title: beat.title,
          oldUrl: beat.coverImageUrl,
          newUrl: null,
          status: "error", // Needs fixing
        });
      } else {
        results.push({
          id: beat.id,
          title: beat.title,
          oldUrl: beat.coverImageUrl,
          newUrl: null,
          status: "ok",
        });
      }
    }

    const broken = results.filter(r => r.status === "error").length;
    const ok = results.filter(r => r.status === "ok").length;
    const notDropbox = results.filter(r => r.status === "not_dropbox").length;
    const missing = results.filter(r => r.status === "not_found").length;

    return NextResponse.json({
      success: true,
      data: {
        total: allBeats.length,
        ok,
        broken,
        notDropbox,
        missing,
        results,
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}

// POST - Fix broken Dropbox URLs
export async function POST() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
  }

  try {
    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json({
        success: false,
        error: "Dropbox no está conectado. Ve a Admin > Sincronización para conectar tu cuenta.",
      }, { status: 400 });
    }

    const allBeats = await db.select().from(beats);
    const results: FixResult[] = [];
    let fixed = 0;

    for (const beat of allBeats) {
      if (!beat.coverImageUrl || !isBrokenDropboxUrl(beat.coverImageUrl)) {
        continue;
      }

      const filename = extractFilename(beat.coverImageUrl);
      if (!filename) {
        results.push({
          id: beat.id,
          title: beat.title,
          oldUrl: beat.coverImageUrl,
          newUrl: null,
          status: "error",
        });
        continue;
      }

      const filePath = await findFileByName(token, filename);
      if (!filePath) {
        results.push({
          id: beat.id,
          title: beat.title,
          oldUrl: beat.coverImageUrl,
          newUrl: null,
          status: "not_found",
        });
        continue;
      }

      const newUrl = await getSharedLinkFromPath(token, filePath);
      if (newUrl) {
        await db.update(beats).set({ coverImageUrl: newUrl }).where(eq(beats.id, beat.id));
        results.push({
          id: beat.id,
          title: beat.title,
          oldUrl: beat.coverImageUrl,
          newUrl,
          status: "fixed",
        });
        fixed++;
      } else {
        results.push({
          id: beat.id,
          title: beat.title,
          oldUrl: beat.coverImageUrl,
          newUrl: null,
          status: "error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${fixed} portadas de beats arregladas`,
      data: { fixed, results },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}
