import { dropboxClient, DropboxClient } from "@/lib/clients";
import { syncJobsRepository } from "@/lib/repositories";
import { db } from "@/db/client";
import { fileAssets, type NewFileAsset } from "@/db/schema";
import { generateUUID } from "@/lib/utils";
import { eq } from "drizzle-orm";

// ===========================================
// DROPBOX SYNC SERVICE
// ===========================================

export interface DropboxSyncOptions {
  paths?: string[]; // Specific paths to sync
  recursive?: boolean;
  force?: boolean;
}

export interface DropboxSyncResult {
  success: boolean;
  filesProcessed: number;
  filesFailed: number;
  totalSize: number;
  errors: string[];
}

/**
 * Sync files from Dropbox
 */
export async function syncDropbox(options: DropboxSyncOptions = {}): Promise<DropboxSyncResult> {
  const result: DropboxSyncResult = {
    success: true,
    filesProcessed: 0,
    filesFailed: 0,
    totalSize: 0,
    errors: [],
  };

  // Check if Dropbox is configured
  if (!dropboxClient.isConfigured()) {
    result.success = false;
    result.errors.push("Dropbox credentials not configured");
    return result;
  }

  // Create sync job
  const syncJob = await syncJobsRepository.create({
    source: "dropbox",
    status: "running",
    startedAt: new Date(),
  });

  try {
    await syncJobsRepository.addLog(syncJob.id, "info", "Starting Dropbox sync");

    // Default paths to sync
    const pathsToSync = options.paths || [
      "/SonidoLiquido/Media",
      "/SonidoLiquido/PressKits",
      "/SonidoLiquido/Beats",
      "/SonidoLiquido/Assets",
    ];

    for (const path of pathsToSync) {
      try {
        await syncJobsRepository.addLog(syncJob.id, "info", `Syncing path: ${path}`);

        // Get files from Dropbox
        const files = options.recursive
          ? await dropboxClient.listFolderRecursive(path)
          : await getFilesFromFolder(path);

        for (const file of files) {
          try {
            // Check if file already exists in database
            const existing = await db
              .select()
              .from(fileAssets)
              .where(eq(fileAssets.storagePath, file.path_lower))
              .limit(1);

            if (existing.length > 0 && !options.force) {
              // Update existing file metadata
              await db
                .update(fileAssets)
                .set({
                  fileSize: file.size,
                  updatedAt: new Date(),
                })
                .where(eq(fileAssets.id, existing[0].id));
            } else if (existing.length === 0) {
              // Get shared link for the file
              let publicUrl: string | null = null;
              try {
                publicUrl = await dropboxClient.getSharedLink(file.path_lower);
              } catch (error) {
                // Shared link creation might fail, continue without it
                console.warn(`Failed to get shared link for ${file.path_lower}`);
              }

              // Create new file asset record
              await db.insert(fileAssets).values({
                id: generateUUID(),
                filename: file.name,
                originalFilename: file.name,
                mimeType: DropboxClient.getMimeType(file.name),
                fileSize: file.size,
                storageProvider: "dropbox",
                storagePath: file.path_lower,
                publicUrl,
                isPublic: Boolean(publicUrl),
              });
            }

            result.filesProcessed++;
            result.totalSize += file.size;
          } catch (error) {
            result.filesFailed++;
            result.errors.push(`Failed to sync file ${file.name}: ${(error as Error).message}`);
          }
        }
      } catch (error) {
        // Path might not exist, log and continue
        await syncJobsRepository.addLog(syncJob.id, "warning", `Failed to sync path: ${path}`, {
          error: (error as Error).message,
        });
      }
    }

    // Get storage usage
    try {
      const usage = await dropboxClient.getSpaceUsage();
      await syncJobsRepository.addLog(syncJob.id, "info", "Storage usage retrieved", {
        used: formatBytes(usage.used),
        allocated: formatBytes(usage.allocated),
        percentUsed: ((usage.used / usage.allocated) * 100).toFixed(2) + "%",
      });
    } catch (error) {
      // Non-critical error
      console.warn("Failed to get Dropbox storage usage");
    }

    // Update sync job
    await syncJobsRepository.update(syncJob.id, {
      status: result.errors.length === 0 ? "completed" : "completed",
      completedAt: new Date(),
      itemsProcessed: result.filesProcessed,
      itemsFailed: result.filesFailed,
      metadata: { totalSize: result.totalSize },
    });

    await syncJobsRepository.addLog(
      syncJob.id,
      result.errors.length === 0 ? "info" : "warning",
      `Dropbox sync completed: ${result.filesProcessed} files (${formatBytes(result.totalSize)})`,
      { errors: result.errors }
    );

  } catch (error) {
    result.success = false;
    result.errors.push(`Sync failed: ${(error as Error).message}`);

    await syncJobsRepository.update(syncJob.id, {
      status: "failed",
      completedAt: new Date(),
      errorMessage: (error as Error).message,
    });

    await syncJobsRepository.addLog(syncJob.id, "error", "Dropbox sync failed", {
      error: (error as Error).message,
    });
  }

  return result;
}

/**
 * Get files from a folder (non-recursive)
 */
async function getFilesFromFolder(path: string) {
  const entries = await dropboxClient.listFolder(path);
  return entries.filter((entry) => "size" in entry) as Array<{
    id: string;
    name: string;
    path_lower: string;
    path_display: string;
    size: number;
  }>;
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Get Dropbox storage information
 */
export async function getDropboxStorageInfo(): Promise<{
  used: number;
  allocated: number;
  usedFormatted: string;
  allocatedFormatted: string;
  percentUsed: number;
} | null> {
  if (!dropboxClient.isConfigured()) {
    return null;
  }

  try {
    const usage = await dropboxClient.getSpaceUsage();
    return {
      used: usage.used,
      allocated: usage.allocated,
      usedFormatted: formatBytes(usage.used),
      allocatedFormatted: formatBytes(usage.allocated),
      percentUsed: (usage.used / usage.allocated) * 100,
    };
  } catch (error) {
    console.error("Failed to get Dropbox storage info:", error);
    return null;
  }
}

/**
 * Sync a specific file from Dropbox
 */
export async function syncDropboxFile(path: string): Promise<boolean> {
  if (!dropboxClient.isConfigured()) {
    throw new Error("Dropbox credentials not configured");
  }

  try {
    const metadata = await dropboxClient.getMetadata(path);

    // Get shared link
    let publicUrl: string | null = null;
    try {
      publicUrl = await dropboxClient.getSharedLink(path);
    } catch {
      // Continue without shared link
    }

    // Check if exists
    const [existing] = await db
      .select()
      .from(fileAssets)
      .where(eq(fileAssets.storagePath, metadata.path_lower))
      .limit(1);

    if (existing) {
      await db
        .update(fileAssets)
        .set({
          fileSize: metadata.size,
          publicUrl,
          updatedAt: new Date(),
        })
        .where(eq(fileAssets.id, existing.id));
    } else {
      await db.insert(fileAssets).values({
        id: generateUUID(),
        filename: metadata.name,
        originalFilename: metadata.name,
        mimeType: DropboxClient.getMimeType(metadata.name),
        fileSize: metadata.size,
        storageProvider: "dropbox",
        storagePath: metadata.path_lower,
        publicUrl,
        isPublic: Boolean(publicUrl),
      });
    }

    return true;
  } catch (error) {
    console.error("Failed to sync Dropbox file:", error);
    return false;
  }
}

/**
 * Get file assets from database
 */
export async function getFileAssets(options: {
  mimeType?: string;
  limit?: number;
} = {}) {
  let query = db.select().from(fileAssets);

  if (options.mimeType) {
    query = query.where(eq(fileAssets.mimeType, options.mimeType)) as typeof query;
  }

  if (options.limit) {
    query = query.limit(options.limit) as typeof query;
  }

  return query;
}
