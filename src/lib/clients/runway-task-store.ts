// ===========================================
// RUNWAY TASK STORE - DATABASE BACKED
// ===========================================
// Stores Runway generation tasks in the database so they persist
// across serverless function cold starts on Netlify.
// Previously used an in-memory Map which was lost on every cold start.

import { isDatabaseConfigured } from "@/db/client";
import type { RunwayModel, RunwayRatio } from "@/lib/clients/runway";
import { type Client, createClient } from "@libsql/client/web";

export interface RunwayTaskInfo {
  id: string;
  upcomingReleaseId?: string;
  artistName: string;
  title: string;
  model: RunwayModel;
  ratio: RunwayRatio;
  duration: number;
  promptText: string;
  promptImage?: string;
  status: string;
  output?: string[];
  error?: string;
  createdAt: string;
  estimatedCost: { credits: number; usd: number };
}

// In-memory cache for the current function instance (reduces DB reads)
const memoryCache = new Map<string, RunwayTaskInfo>();
const CACHE_TTL = 30 * 1000; // 30 seconds
const cacheTimestamps = new Map<string, number>();

// Singleton libsql client (reused across calls in the same function instance)
let _dbClient: Client | null = null;

function getDbClient(): Client | null {
  if (_dbClient) return _dbClient;

  const url = (
    process.env.DATABASE_URL ||
    process.env.TURSO_DATABASE_URL ||
    process.env.LIBSQL_URL ||
    ""
  ).trim();
  const token = (
    process.env.DATABASE_AUTH_TOKEN ||
    process.env.TURSO_AUTH_TOKEN ||
    process.env.LIBSQL_AUTH_TOKEN ||
    ""
  ).trim();
  if (!url || !token) return null;

  _dbClient = createClient({ url, authToken: token });
  return _dbClient;
}

// Ensure the runway_tasks table exists
let _tableEnsured = false;
let _tableEnsurePromise: Promise<void> | null = null;

async function ensureTable(): Promise<void> {
  if (_tableEnsured) return;

  // Prevent concurrent table creation attempts
  if (_tableEnsurePromise) {
    await _tableEnsurePromise;
    return;
  }

  _tableEnsurePromise = _doEnsureTable();
  await _tableEnsurePromise;
}

async function _doEnsureTable(): Promise<void> {
  if (!isDatabaseConfigured()) {
    _tableEnsured = true; // Nothing to ensure, skip future calls
    return;
  }

  const client = getDbClient();
  if (!client) {
    _tableEnsured = true;
    return;
  }

  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS runway_tasks (
        id TEXT PRIMARY KEY NOT NULL,
        upcoming_release_id TEXT,
        artist_name TEXT NOT NULL DEFAULT 'Unknown',
        title TEXT NOT NULL DEFAULT 'Untitled',
        model TEXT NOT NULL DEFAULT 'gen4_turbo',
        ratio TEXT NOT NULL DEFAULT '720:1280',
        duration INTEGER NOT NULL DEFAULT 5,
        prompt_text TEXT NOT NULL DEFAULT '',
        prompt_image TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING',
        output TEXT,
        error TEXT,
        estimated_cost_credits REAL NOT NULL DEFAULT 0,
        estimated_cost_usd REAL NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    await client.execute(
      "CREATE INDEX IF NOT EXISTS idx_runway_tasks_status ON runway_tasks(status)",
    );
    await client.execute(
      "CREATE INDEX IF NOT EXISTS idx_runway_tasks_created ON runway_tasks(created_at DESC)",
    );
    console.log("[Runway Task Store] Table ensured");
  } catch (err) {
    console.error("[Runway Task Store] Failed to ensure table:", err);
    // Don't set _tableEnsured = true on failure — let it retry next time
    return;
  }

  // Only mark as ensured AFTER successful table creation
  _tableEnsured = true;
}

/**
 * Convert a DB row to a RunwayTaskInfo object
 */
// biome-ignore lint/suspicious/noExplicitAny: DB row shape is dynamic
function rowToTaskInfo(row: Record<string, any>): RunwayTaskInfo {
  return {
    id: row.id,
    upcomingReleaseId: row.upcoming_release_id || undefined,
    artistName: row.artist_name || "Unknown",
    title: row.title || "Untitled",
    model: row.model as RunwayModel,
    ratio: row.ratio as RunwayRatio,
    duration: row.duration || 5,
    promptText: row.prompt_text || "",
    promptImage: row.prompt_image || undefined,
    status: row.status || "PENDING",
    output: row.output ? JSON.parse(row.output) : undefined,
    error: row.error || undefined,
    createdAt: row.created_at
      ? new Date(row.created_at * 1000).toISOString()
      : new Date().toISOString(),
    estimatedCost: {
      credits: row.estimated_cost_credits || 0,
      usd: row.estimated_cost_usd || 0,
    },
  };
}

/**
 * Store a new task in the database
 */
export async function storeTask(task: RunwayTaskInfo): Promise<void> {
  // Always update the memory cache
  memoryCache.set(task.id, task);
  cacheTimestamps.set(task.id, Date.now());

  await ensureTable();

  const client = getDbClient();
  if (!client) {
    console.warn(
      "[Runway Task Store] Database not configured, task stored in memory only",
    );
    return;
  }

  try {
    // Use INSERT OR IGNORE to avoid overwriting existing tasks (preserves created_at)
    const now = Math.floor(Date.now() / 1000);
    await client.execute({
      sql: `INSERT OR IGNORE INTO runway_tasks
        (id, upcoming_release_id, artist_name, title, model, ratio, duration,
         prompt_text, prompt_image, status, output, error,
         estimated_cost_credits, estimated_cost_usd, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        task.id,
        task.upcomingReleaseId || null,
        task.artistName,
        task.title,
        task.model,
        task.ratio,
        task.duration,
        task.promptText,
        task.promptImage || null,
        task.status,
        task.output ? JSON.stringify(task.output) : null,
        task.error || null,
        task.estimatedCost.credits,
        task.estimatedCost.usd,
        now,
        now,
      ],
    });
  } catch (err) {
    console.error("[Runway Task Store] Failed to store task:", err);
  }
}

/**
 * Update an existing task's status, output, and error.
 *
 * IMPORTANT: Only updates output/error if they have meaningful values.
 * This prevents polling from overwriting valid data with null/undefined
 * when Runway hasn't produced output yet.
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Pick<RunwayTaskInfo, "status" | "output" | "error">>,
): Promise<void> {
  // Update memory cache
  const cached = memoryCache.get(taskId);
  if (cached) {
    if (updates.status !== undefined) cached.status = updates.status;
    // Only update output if we have actual output data
    if (updates.output !== undefined && updates.output.length > 0)
      cached.output = updates.output;
    // Only update error if there's an actual error message
    if (updates.error !== undefined && updates.error)
      cached.error = updates.error;
  }
  cacheTimestamps.set(taskId, Date.now());

  await ensureTable();

  const client = getDbClient();
  if (!client) return;

  try {
    const now = Math.floor(Date.now() / 1000);

    // Build dynamic SET clause — only update fields that have values
    // This prevents overwriting valid output with null during polling
    const setClauses: string[] = ["status = ?", "updated_at = ?"];
    // biome-ignore lint/suspicious/noExplicitAny: dynamic SQL args
    const args: any[] = [updates.status ?? "PENDING", now];

    if (updates.output !== undefined && updates.output.length > 0) {
      setClauses.push("output = ?");
      args.push(JSON.stringify(updates.output));
    }

    if (updates.error !== undefined && updates.error) {
      setClauses.push("error = ?");
      args.push(updates.error);
    }

    args.push(taskId);

    await client.execute({
      sql: `UPDATE runway_tasks SET ${setClauses.join(", ")} WHERE id = ?`,
      args,
    });
  } catch (err) {
    console.error("[Runway Task Store] Failed to update task:", err);
  }
}

/**
 * Get a task by ID
 */
export async function getTask(
  taskId: string,
): Promise<RunwayTaskInfo | undefined> {
  // Check memory cache first
  const cached = memoryCache.get(taskId);
  const cacheAge = cacheTimestamps.get(taskId) || 0;
  if (cached && Date.now() - cacheAge < CACHE_TTL) {
    return cached;
  }

  await ensureTable();

  const client = getDbClient();
  if (!client) {
    return cached; // Return stale cache if DB not available
  }

  try {
    const result = await client.execute({
      sql: "SELECT * FROM runway_tasks WHERE id = ?",
      args: [taskId],
    });

    if (result.rows.length > 0) {
      const task = rowToTaskInfo(result.rows[0]);
      memoryCache.set(taskId, task);
      cacheTimestamps.set(taskId, Date.now());
      return task;
    }

    return undefined;
  } catch (err) {
    console.error("[Runway Task Store] Failed to get task:", err);
    return cached; // Return stale cache on error
  }
}

/**
 * Get all tasks, sorted by creation date (newest first)
 */
export async function getAllTasks(): Promise<RunwayTaskInfo[]> {
  await ensureTable();

  const client = getDbClient();
  if (!client) {
    // Return memory cache if DB not available
    return Array.from(memoryCache.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  try {
    const result = await client.execute(
      "SELECT * FROM runway_tasks ORDER BY created_at DESC LIMIT 100",
    );

    const tasks = result.rows.map(rowToTaskInfo);

    // Update memory cache
    for (const task of tasks) {
      memoryCache.set(task.id, task);
      cacheTimestamps.set(task.id, Date.now());
    }

    return tasks;
  } catch (err) {
    console.error("[Runway Task Store] Failed to get all tasks:", err);
    return Array.from(memoryCache.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }
}

/**
 * Delete old completed tasks (cleanup)
 */
export async function cleanupOldTasks(maxAgeDays = 7): Promise<number> {
  const client = getDbClient();
  if (!client) return 0;

  try {
    const cutoff = Math.floor(Date.now() / 1000) - maxAgeDays * 86400;
    const result = await client.execute({
      sql: "DELETE FROM runway_tasks WHERE status IN ('SUCCEEDED', 'FAILED', 'CANCELLED') AND created_at < ?",
      args: [cutoff],
    });

    const deleted = result.rowsAffected || 0;
    if (deleted > 0) {
      console.log(`[Runway Task Store] Cleaned up ${deleted} old tasks`);
    }
    return deleted;
  } catch (err) {
    console.error("[Runway Task Store] Cleanup failed:", err);
    return 0;
  }
}
