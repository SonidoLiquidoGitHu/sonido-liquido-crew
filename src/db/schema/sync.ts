import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
// ===========================================
// SYNC JOBS TABLE
// ===========================================
export const syncJobs = sqliteTable("sync_jobs", {
  id: text("id").primaryKey(),
  source: text("source", {
    enum: ["spotify", "youtube", "dropbox"]
  }).notNull(),
  status: text("status", {
    enum: ["pending", "running", "completed", "failed"]
  }).notNull().default("pending"),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  itemsProcessed: integer("items_processed").notNull().default(0),
  itemsFailed: integer("items_failed").notNull().default(0),
  errorMessage: text("error_message"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
// ===========================================
// SYNC LOGS TABLE
// ===========================================
export const syncLogs = sqliteTable("sync_logs", {
  id: text("id").primaryKey(),
  syncJobId: text("sync_job_id").notNull().references(() => syncJobs.id, { onDelete: "cascade" }),
  level: text("level", {
    enum: ["info", "warning", "error"]
  }).notNull().default("info"),
  message: text("message").notNull(),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
// ===========================================
// TYPE EXPORTS
// ===========================================
export type SyncJob = typeof syncJobs.$inferSelect;
export type NewSyncJob = typeof syncJobs.$inferInsert;
export type SyncLog = typeof syncLogs.$inferSelect;
export type NewSyncLog = typeof syncLogs.$inferInsert;