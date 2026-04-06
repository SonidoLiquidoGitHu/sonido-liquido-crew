import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
// ===========================================
// SYNC LOG TABLE
// ===========================================
export const syncLogs = sqliteTable("sync_logs", {
  id: text("id").primaryKey(),
  service: text("service", {
    enum: ["spotify", "youtube", "dropbox", "mailchimp"]
  }).notNull(),
  status: text("status", {
    enum: ["started", "completed", "failed"]
  }).notNull(),
  itemsProcessed: integer("items_processed").notNull().default(0),
  itemsCreated: integer("items_created").notNull().default(0),
  itemsUpdated: integer("items_updated").notNull().default(0),
  itemsFailed: integer("items_failed").notNull().default(0),
  errorMessage: text("error_message"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});
// ===========================================
// TYPE EXPORTS
// ===========================================
export type SyncLog = typeof syncLogs.$inferSelect;
export type NewSyncLog = typeof syncLogs.$inferInsert;
