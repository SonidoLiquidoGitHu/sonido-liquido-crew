import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { beats, campaigns, mediaReleases, fileAssets } from "@/db/schema";
import { dropboxClient } from "@/lib/clients/dropbox";
import { eq, isNotNull, desc } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

interface SyncResult {
  success: boolean;
  message: string;
  stats: {
    beatsProcessed: number;
    campaignsProcessed: number;
    mediaReleasesProcessed: number;
    filesVerified: number;
    filesMissing: number;
    filesTracked: number;
    errors: string[];
  };
}

// Verify a URL is accessible
async function verifyUrl(url: string): Promise<boolean> {
  if (!url) return false;
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "follow" });
    return response.ok;
  } catch {
    return false;
  }
}

// Track a file in file_assets if not already tracked
async function trackFileAsset(
  url: string,
  entityType: string,
  entityId: string,
  fieldName: string
): Promise<void> {
  // Extract path from Dropbox URL
  let storagePath = url;
  if (url.includes("dropboxusercontent.com")) {
    // Convert to storage path format
    const pathMatch = url.match(/\/s\/[^\/]+\/(.+)/);
    if (pathMatch) {
      storagePath = `/${pathMatch[1]}`;
    }
  }

  // Check if already tracked
  const existing = await db
    .select()
    .from(fileAssets)
    .where(eq(fileAssets.publicUrl, url))
    .limit(1);

  if (existing.length === 0) {
    // Determine mime type from URL
    const ext = url.split(".").pop()?.toLowerCase() || "";
    const mimeTypes: Record<string, string> = {
      mp3: "audio/mpeg",
      wav: "audio/wav",
      flac: "audio/flac",
      m4a: "audio/mp4",
      ogg: "audio/ogg",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      pdf: "application/pdf",
      zip: "application/zip",
    };
    const mimeType = mimeTypes[ext] || "application/octet-stream";

    // Extract filename from URL
    const filename = url.split("/").pop() || "unknown";

    await db.insert(fileAssets).values({
      id: generateUUID(),
      filename,
      originalFilename: filename,
      mimeType,
      fileSize: 0, // Unknown without fetching
      storageProvider: "dropbox",
      storagePath,
      publicUrl: url,
      isPublic: true,
      metadata: {
        entityType,
        entityId,
        fieldName,
        trackedAt: new Date().toISOString(),
      },
    });
  }
}

// Sync beats media files
async function syncBeatsMedia(stats: SyncResult["stats"]): Promise<void> {
  const allBeats = await db.select().from(beats).orderBy(desc(beats.createdAt));

  for (const beat of allBeats) {
    stats.beatsProcessed++;

    // Check and track cover image
    if (beat.coverImageUrl) {
      const isValid = await verifyUrl(beat.coverImageUrl);
      if (isValid) {
        stats.filesVerified++;
        if (beat.coverImageUrl.includes("dropbox")) {
          await trackFileAsset(beat.coverImageUrl, "beat", beat.id, "coverImageUrl");
          stats.filesTracked++;
        }
      } else {
        stats.filesMissing++;
        stats.errors.push(`Beat "${beat.title}": cover image URL invalid`);
      }
    }

    // Check and track preview audio
    if (beat.previewAudioUrl) {
      const isValid = await verifyUrl(beat.previewAudioUrl);
      if (isValid) {
        stats.filesVerified++;
        if (beat.previewAudioUrl.includes("dropbox")) {
          await trackFileAsset(beat.previewAudioUrl, "beat", beat.id, "previewAudioUrl");
          stats.filesTracked++;
        }
      } else {
        stats.filesMissing++;
        stats.errors.push(`Beat "${beat.title}": preview audio URL invalid`);
      }
    }

    // Check and track full audio
    if (beat.fullAudioUrl) {
      const isValid = await verifyUrl(beat.fullAudioUrl);
      if (isValid) {
        stats.filesVerified++;
        if (beat.fullAudioUrl.includes("dropbox")) {
          await trackFileAsset(beat.fullAudioUrl, "beat", beat.id, "fullAudioUrl");
          stats.filesTracked++;
        }
      } else {
        stats.filesMissing++;
        stats.errors.push(`Beat "${beat.title}": full audio URL invalid`);
      }
    }

    // Check and track stems
    if (beat.stemPackUrl) {
      const isValid = await verifyUrl(beat.stemPackUrl);
      if (isValid) {
        stats.filesVerified++;
        if (beat.stemPackUrl.includes("dropbox")) {
          await trackFileAsset(beat.stemPackUrl, "beat", beat.id, "stemPackUrl");
          stats.filesTracked++;
        }
      } else {
        stats.filesMissing++;
        stats.errors.push(`Beat "${beat.title}": stems URL invalid`);
      }
    }
  }
}

// Sync campaigns media files
async function syncCampaignsMedia(stats: SyncResult["stats"]): Promise<void> {
  const allCampaigns = await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));

  for (const campaign of allCampaigns) {
    stats.campaignsProcessed++;

    // Check and track cover image
    if (campaign.coverImageUrl) {
      const isValid = await verifyUrl(campaign.coverImageUrl);
      if (isValid) {
        stats.filesVerified++;
        if (campaign.coverImageUrl.includes("dropbox")) {
          await trackFileAsset(campaign.coverImageUrl, "campaign", campaign.id, "coverImageUrl");
          stats.filesTracked++;
        }
      } else {
        stats.filesMissing++;
        stats.errors.push(`Campaign "${campaign.title}": cover image URL invalid`);
      }
    }

    // Check and track banner image
    if (campaign.bannerImageUrl) {
      const isValid = await verifyUrl(campaign.bannerImageUrl);
      if (isValid) {
        stats.filesVerified++;
        if (campaign.bannerImageUrl.includes("dropbox")) {
          await trackFileAsset(campaign.bannerImageUrl, "campaign", campaign.id, "bannerImageUrl");
          stats.filesTracked++;
        }
      } else {
        stats.filesMissing++;
        stats.errors.push(`Campaign "${campaign.title}": banner image URL invalid`);
      }
    }

    // Check and track download file
    if (campaign.downloadFileUrl) {
      const isValid = await verifyUrl(campaign.downloadFileUrl);
      if (isValid) {
        stats.filesVerified++;
        if (campaign.downloadFileUrl.includes("dropbox")) {
          await trackFileAsset(campaign.downloadFileUrl, "campaign", campaign.id, "downloadFileUrl");
          stats.filesTracked++;
        }
      } else {
        stats.filesMissing++;
        stats.errors.push(`Campaign "${campaign.title}": download file URL invalid`);
      }
    }
  }
}

// Sync media releases files
async function syncMediaReleasesMedia(stats: SyncResult["stats"]): Promise<void> {
  const allMediaReleases = await db.select().from(mediaReleases).orderBy(desc(mediaReleases.createdAt));

  for (const release of allMediaReleases) {
    stats.mediaReleasesProcessed++;

    // Check and track cover image
    if (release.coverImageUrl) {
      const isValid = await verifyUrl(release.coverImageUrl);
      if (isValid) {
        stats.filesVerified++;
        if (release.coverImageUrl.includes("dropbox")) {
          await trackFileAsset(release.coverImageUrl, "media_release", release.id, "coverImageUrl");
          stats.filesTracked++;
        }
      } else {
        stats.filesMissing++;
        stats.errors.push(`Media Release "${release.title}": cover image URL invalid`);
      }
    }

    // Check and track banner image
    if (release.bannerImageUrl) {
      const isValid = await verifyUrl(release.bannerImageUrl);
      if (isValid) {
        stats.filesVerified++;
        if (release.bannerImageUrl.includes("dropbox")) {
          await trackFileAsset(release.bannerImageUrl, "media_release", release.id, "bannerImageUrl");
          stats.filesTracked++;
        }
      } else {
        stats.filesMissing++;
        stats.errors.push(`Media Release "${release.title}": banner image URL invalid`);
      }
    }

    // Check and track audio preview
    if (release.audioPreviewUrl) {
      const isValid = await verifyUrl(release.audioPreviewUrl);
      if (isValid) {
        stats.filesVerified++;
        if (release.audioPreviewUrl.includes("dropbox")) {
          await trackFileAsset(release.audioPreviewUrl, "media_release", release.id, "audioPreviewUrl");
          stats.filesTracked++;
        }
      } else {
        stats.filesMissing++;
        stats.errors.push(`Media Release "${release.title}": audio preview URL invalid`);
      }
    }

    // Check and track press kit
    if (release.pressKitUrl) {
      const isValid = await verifyUrl(release.pressKitUrl);
      if (isValid) {
        stats.filesVerified++;
        if (release.pressKitUrl.includes("dropbox")) {
          await trackFileAsset(release.pressKitUrl, "media_release", release.id, "pressKitUrl");
          stats.filesTracked++;
        }
      } else {
        stats.filesMissing++;
        stats.errors.push(`Media Release "${release.title}": press kit URL invalid`);
      }
    }

    // Check and track high-res images
    if (release.highResImagesUrl) {
      const isValid = await verifyUrl(release.highResImagesUrl);
      if (isValid) {
        stats.filesVerified++;
        if (release.highResImagesUrl.includes("dropbox")) {
          await trackFileAsset(release.highResImagesUrl, "media_release", release.id, "highResImagesUrl");
          stats.filesTracked++;
        }
      } else {
        stats.filesMissing++;
        stats.errors.push(`Media Release "${release.title}": high-res images URL invalid`);
      }
    }

    // Check and track liner notes
    if (release.linerNotesUrl) {
      const isValid = await verifyUrl(release.linerNotesUrl);
      if (isValid) {
        stats.filesVerified++;
        if (release.linerNotesUrl.includes("dropbox")) {
          await trackFileAsset(release.linerNotesUrl, "media_release", release.id, "linerNotesUrl");
          stats.filesTracked++;
        }
      } else {
        stats.filesMissing++;
        stats.errors.push(`Media Release "${release.title}": liner notes URL invalid`);
      }
    }

    // Check and track gallery images
    if (release.galleryImages) {
      try {
        const gallery = typeof release.galleryImages === "string"
          ? JSON.parse(release.galleryImages)
          : release.galleryImages;

        if (Array.isArray(gallery)) {
          for (let i = 0; i < gallery.length; i++) {
            const imageUrl = gallery[i];
            if (imageUrl && typeof imageUrl === "string") {
              const isValid = await verifyUrl(imageUrl);
              if (isValid) {
                stats.filesVerified++;
                if (imageUrl.includes("dropbox")) {
                  await trackFileAsset(imageUrl, "media_release", release.id, `galleryImages[${i}]`);
                  stats.filesTracked++;
                }
              } else {
                stats.filesMissing++;
              }
            }
          }
        }
      } catch {
        // Gallery images parsing failed
      }
    }
  }
}

export async function POST(request: NextRequest) {
  console.log("\n📦 STARTING DROPBOX MEDIA SYNC\n");
  console.log("=".repeat(50));

  const result: SyncResult = {
    success: true,
    message: "",
    stats: {
      beatsProcessed: 0,
      campaignsProcessed: 0,
      mediaReleasesProcessed: 0,
      filesVerified: 0,
      filesMissing: 0,
      filesTracked: 0,
      errors: [],
    },
  };

  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        success: false,
        error: "Database not configured",
      }, { status: 503 });
    }

    // Check if Dropbox is configured
    const isDropboxConfigured = await dropboxClient.isConfiguredAsync();
    console.log(`[Dropbox Sync] Dropbox configured: ${isDropboxConfigured}`);

    // Sync beats
    console.log("\n🎵 Syncing beats...");
    await syncBeatsMedia(result.stats);
    console.log(`   Processed: ${result.stats.beatsProcessed} beats`);

    // Sync campaigns
    console.log("\n📢 Syncing campaigns...");
    await syncCampaignsMedia(result.stats);
    console.log(`   Processed: ${result.stats.campaignsProcessed} campaigns`);

    // Sync media releases
    console.log("\n📰 Syncing media releases...");
    await syncMediaReleasesMedia(result.stats);
    console.log(`   Processed: ${result.stats.mediaReleasesProcessed} media releases`);

    console.log("\n" + "=".repeat(50));
    console.log("📊 SYNC COMPLETE");
    console.log(`   Files verified: ${result.stats.filesVerified}`);
    console.log(`   Files missing: ${result.stats.filesMissing}`);
    console.log(`   Files tracked: ${result.stats.filesTracked}`);
    console.log(`   Errors: ${result.stats.errors.length}`);
    console.log("=".repeat(50) + "\n");

    result.message = `Synced ${result.stats.beatsProcessed} beats, ${result.stats.campaignsProcessed} campaigns, ${result.stats.mediaReleasesProcessed} media releases. ${result.stats.filesVerified} files verified, ${result.stats.filesTracked} tracked in database.`;

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Dropbox sync failed:", error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      stats: result.stats,
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        success: false,
        error: "Database not configured",
      }, { status: 503 });
    }

    // Get counts
    const beatsCount = await db.select().from(beats);
    const campaignsCount = await db.select().from(campaigns);
    const mediaReleasesCount = await db.select().from(mediaReleases);
    const fileAssetsCount = await db.select().from(fileAssets);

    // Check Dropbox configuration
    const isDropboxConfigured = await dropboxClient.isConfiguredAsync();

    return NextResponse.json({
      success: true,
      data: {
        dropboxConfigured: isDropboxConfigured,
        counts: {
          beats: beatsCount.length,
          campaigns: campaignsCount.length,
          mediaReleases: mediaReleasesCount.length,
          fileAssets: fileAssetsCount.length,
        },
      },
    });
  } catch (error) {
    console.error("[Dropbox Sync] Error:", error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}
