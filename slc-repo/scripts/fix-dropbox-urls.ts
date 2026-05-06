/**
 * Fix broken Dropbox URLs in ALL database tables
 *
 * This script regenerates shared links for Dropbox files
 * that are missing the required rlkey parameter.
 *
 * Run with: bun run scripts/fix-dropbox-urls.ts
 */

import { db } from "../src/db/client.js";
import {
  upcomingReleases,
  releases,
  artists,
  events,
  galleryPhotos,
  beats,
  products
} from "../src/db/schema/index.js";
import { eq, like, or, sql } from "drizzle-orm";

// Import dropbox client
const DROPBOX_BASE_URL = "https://api.dropboxapi.com/2";

interface FixResult {
  table: string;
  id: string;
  field: string;
  oldUrl: string;
  newUrl: string | null;
  status: "fixed" | "not_found" | "error";
}

const results: FixResult[] = [];

async function getAccessToken(): Promise<string> {
  const { siteSettings } = await import("../src/db/schema/index.js");
  const { inArray } = await import("drizzle-orm");

  const tokenResults = await db
    .select()
    .from(siteSettings)
    .where(inArray(siteSettings.key, ["dropbox_access_token"]));

  const tokenRow = tokenResults.find(r => r.key === "dropbox_access_token");
  if (!tokenRow?.value) {
    throw new Error("No Dropbox access token found in database");
  }

  return tokenRow.value;
}

interface DropboxSharedLink {
  url: string;
  name: string;
  path_lower: string;
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
        settings: {
          access: "viewer",
          audience: "public",
          requested_visibility: "public",
        },
      }),
    });

    if (createResponse.ok) {
      const data: DropboxSharedLink = await createResponse.json();
      return convertToDirectLink(data.url);
    }

    // Handle "link already exists" error
    const errorData = await createResponse.json().catch(() => ({}));
    if (errorData.error_summary?.includes("shared_link_already_exists")) {
      const retryResponse = await fetch(`${DROPBOX_BASE_URL}/sharing/list_shared_links`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path, direct_only: true }),
      });

      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        if (retryData.links && retryData.links.length > 0) {
          return convertToDirectLink(retryData.links[0].url);
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`Error getting shared link for ${path}:`, error);
    return null;
  }
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

function extractFilename(url: string): string | null {
  const match = url.match(/\/([^/?]+)(?:\?|$)/);
  return match ? match[1] : null;
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
        options: {
          max_results: 10,
          filename_only: true,
        },
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

    // Try partial match
    for (const match of matches) {
      const metadata = match.metadata?.metadata;
      if (metadata?.name?.includes(filename.split("_")[0])) {
        return metadata.path_display || metadata.path_lower;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function testUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

function isDropboxUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("dropboxusercontent.com") || url.includes("dropbox.com");
}

function isBrokenDropboxUrl(url: string): boolean {
  // URL is broken if it's a Dropbox URL without rlkey parameter
  if (!isDropboxUrl(url)) return false;
  return !url.includes("rlkey=");
}

async function fixUrl(token: string, url: string, table: string, id: string, field: string): Promise<string | null> {
  if (!isBrokenDropboxUrl(url)) {
    return null; // Not broken
  }

  console.log(`   ❌ Broken URL: ${url.substring(0, 80)}...`);

  const filename = extractFilename(url);
  if (!filename) {
    console.log(`   ⚠️  Could not extract filename`);
    results.push({ table, id, field, oldUrl: url, newUrl: null, status: "error" });
    return null;
  }

  console.log(`   🔍 Searching for: ${filename}`);
  const filePath = await findFileByName(token, filename);

  if (!filePath) {
    console.log(`   ⚠️  File not found in Dropbox`);
    results.push({ table, id, field, oldUrl: url, newUrl: null, status: "not_found" });
    return null;
  }

  console.log(`   📁 Found at: ${filePath}`);
  const newUrl = await getSharedLinkFromPath(token, filePath);

  if (newUrl) {
    console.log(`   ✅ New URL: ${newUrl.substring(0, 80)}...`);
    results.push({ table, id, field, oldUrl: url, newUrl, status: "fixed" });
    return newUrl;
  }

  results.push({ table, id, field, oldUrl: url, newUrl: null, status: "error" });
  return null;
}

// ===========================================
// TABLE-SPECIFIC FIXERS
// ===========================================

async function fixUpcomingReleases(token: string) {
  console.log("\n📀 Checking upcoming_releases...\n");

  const all = await db.select().from(upcomingReleases);
  let fixed = 0;

  for (const item of all) {
    const updates: Record<string, string> = {};

    if (isBrokenDropboxUrl(item.coverImageUrl || "")) {
      console.log(`\n📀 ${item.title} - Cover`);
      const newUrl = await fixUrl(token, item.coverImageUrl!, "upcoming_releases", item.id, "coverImageUrl");
      if (newUrl) updates.coverImageUrl = newUrl;
    }

    if (isBrokenDropboxUrl(item.bannerImageUrl || "")) {
      console.log(`\n📀 ${item.title} - Banner`);
      const newUrl = await fixUrl(token, item.bannerImageUrl!, "upcoming_releases", item.id, "bannerImageUrl");
      if (newUrl) updates.bannerImageUrl = newUrl;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(upcomingReleases).set(updates).where(eq(upcomingReleases.id, item.id));
      fixed++;
    }
  }

  console.log(`\n✅ upcoming_releases: ${fixed} records updated`);
}

async function fixReleases(token: string) {
  console.log("\n💿 Checking releases...\n");

  const all = await db.select().from(releases);
  let fixed = 0;

  for (const item of all) {
    const updates: Record<string, string> = {};

    if (isBrokenDropboxUrl(item.coverImageUrl || "")) {
      console.log(`\n💿 ${item.title} - Cover`);
      const newUrl = await fixUrl(token, item.coverImageUrl!, "releases", item.id, "coverImageUrl");
      if (newUrl) updates.coverImageUrl = newUrl;
    }

    if (isBrokenDropboxUrl(item.pressKitUrl || "")) {
      console.log(`\n💿 ${item.title} - Press Kit`);
      const newUrl = await fixUrl(token, item.pressKitUrl!, "releases", item.id, "pressKitUrl");
      if (newUrl) updates.pressKitUrl = newUrl;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(releases).set(updates).where(eq(releases.id, item.id));
      fixed++;
    }
  }

  console.log(`\n✅ releases: ${fixed} records updated`);
}

async function fixArtists(token: string) {
  console.log("\n🎤 Checking artists...\n");

  const all = await db.select().from(artists);
  let fixed = 0;

  for (const item of all) {
    const updates: Record<string, string> = {};

    if (isBrokenDropboxUrl(item.imageUrl || "")) {
      console.log(`\n🎤 ${item.name} - Image`);
      const newUrl = await fixUrl(token, item.imageUrl!, "artists", item.id, "imageUrl");
      if (newUrl) updates.imageUrl = newUrl;
    }

    if (isBrokenDropboxUrl(item.bannerImageUrl || "")) {
      console.log(`\n🎤 ${item.name} - Banner`);
      const newUrl = await fixUrl(token, item.bannerImageUrl!, "artists", item.id, "bannerImageUrl");
      if (newUrl) updates.bannerImageUrl = newUrl;
    }

    if (isBrokenDropboxUrl(item.logoUrl || "")) {
      console.log(`\n🎤 ${item.name} - Logo`);
      const newUrl = await fixUrl(token, item.logoUrl!, "artists", item.id, "logoUrl");
      if (newUrl) updates.logoUrl = newUrl;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(artists).set(updates).where(eq(artists.id, item.id));
      fixed++;
    }
  }

  console.log(`\n✅ artists: ${fixed} records updated`);
}

async function fixEvents(token: string) {
  console.log("\n📅 Checking events...\n");

  const all = await db.select().from(events);
  let fixed = 0;

  for (const item of all) {
    const updates: Record<string, string> = {};

    if (isBrokenDropboxUrl(item.imageUrl || "")) {
      console.log(`\n📅 ${item.title} - Image`);
      const newUrl = await fixUrl(token, item.imageUrl!, "events", item.id, "imageUrl");
      if (newUrl) updates.imageUrl = newUrl;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(events).set(updates).where(eq(events.id, item.id));
      fixed++;
    }
  }

  console.log(`\n✅ events: ${fixed} records updated`);
}

async function fixGalleryPhotos(token: string) {
  console.log("\n🖼️ Checking gallery_photos...\n");

  const all = await db.select().from(galleryPhotos);
  let fixed = 0;

  for (const item of all) {
    const updates: Record<string, string> = {};

    if (isBrokenDropboxUrl(item.imageUrl || "")) {
      console.log(`\n🖼️ ${item.title || item.id} - Image`);
      const newUrl = await fixUrl(token, item.imageUrl!, "gallery_photos", item.id, "imageUrl");
      if (newUrl) updates.imageUrl = newUrl;
    }

    if (isBrokenDropboxUrl(item.thumbnailUrl || "")) {
      console.log(`\n🖼️ ${item.title || item.id} - Thumbnail`);
      const newUrl = await fixUrl(token, item.thumbnailUrl!, "gallery_photos", item.id, "thumbnailUrl");
      if (newUrl) updates.thumbnailUrl = newUrl;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(galleryPhotos).set(updates).where(eq(galleryPhotos.id, item.id));
      fixed++;
    }
  }

  console.log(`\n✅ gallery_photos: ${fixed} records updated`);
}

async function fixBeats(token: string) {
  console.log("\n🎵 Checking beats...\n");

  const all = await db.select().from(beats);
  let fixed = 0;

  for (const item of all) {
    const updates: Record<string, string> = {};

    if (isBrokenDropboxUrl(item.coverImageUrl || "")) {
      console.log(`\n🎵 ${item.title} - Cover`);
      const newUrl = await fixUrl(token, item.coverImageUrl!, "beats", item.id, "coverImageUrl");
      if (newUrl) updates.coverImageUrl = newUrl;
    }

    if (isBrokenDropboxUrl(item.previewAudioUrl || "")) {
      console.log(`\n🎵 ${item.title} - Preview Audio`);
      const newUrl = await fixUrl(token, item.previewAudioUrl!, "beats", item.id, "previewAudioUrl");
      if (newUrl) updates.previewAudioUrl = newUrl;
    }

    if (isBrokenDropboxUrl(item.fullAudioUrl || "")) {
      console.log(`\n🎵 ${item.title} - Full Audio`);
      const newUrl = await fixUrl(token, item.fullAudioUrl!, "beats", item.id, "fullAudioUrl");
      if (newUrl) updates.fullAudioUrl = newUrl;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(beats).set(updates).where(eq(beats.id, item.id));
      fixed++;
    }
  }

  console.log(`\n✅ beats: ${fixed} records updated`);
}

async function fixProducts(token: string) {
  console.log("\n🛍️ Checking products...\n");

  const all = await db.select().from(products);
  let fixed = 0;

  for (const item of all) {
    const updates: Record<string, string> = {};

    if (isBrokenDropboxUrl(item.imageUrl || "")) {
      console.log(`\n🛍️ ${item.name} - Image`);
      const newUrl = await fixUrl(token, item.imageUrl!, "products", item.id, "imageUrl");
      if (newUrl) updates.imageUrl = newUrl;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(products).set(updates).where(eq(products.id, item.id));
      fixed++;
    }
  }

  console.log(`\n✅ products: ${fixed} records updated`);
}

// ===========================================
// MAIN
// ===========================================

async function main() {
  console.log("🔧 Dropbox URL Fixer - All Tables\n");
  console.log("=".repeat(60));

  try {
    console.log("📡 Getting Dropbox access token...");
    const token = await getAccessToken();
    console.log("✅ Token retrieved\n");

    // Fix all tables
    await fixUpcomingReleases(token);
    await fixReleases(token);
    await fixArtists(token);
    await fixEvents(token);
    await fixGalleryPhotos(token);
    await fixBeats(token);
    await fixProducts(token);

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 SUMMARY\n");

    const fixed = results.filter(r => r.status === "fixed").length;
    const notFound = results.filter(r => r.status === "not_found").length;
    const errors = results.filter(r => r.status === "error").length;

    console.log(`✅ Fixed: ${fixed}`);
    console.log(`⚠️  Not Found: ${notFound}`);
    console.log(`❌ Errors: ${errors}`);

    if (notFound > 0 || errors > 0) {
      console.log("\n📋 Issues:");
      for (const r of results.filter(r => r.status !== "fixed")) {
        console.log(`   - ${r.table}.${r.field} (${r.id}): ${r.status}`);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Done!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
