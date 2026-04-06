import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
// ===========================================
// FILE ASSETS TABLE
// ===========================================
export const fileAssets = sqliteTable("file_assets", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  storageProvider: text("storage_provider", {
    enum: ["dropbox", "local", "s3"]
  }).notNull().default("dropbox"),
  storagePath: text("storage_path").notNull(),
  publicUrl: text("public_url"),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
// ===========================================
// DOWNLOAD GATES TABLE
// ===========================================
export const downloadGates = sqliteTable("download_gates", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  fileAssetId: text("file_asset_id").notNull().references(() => fileAssets.id, { onDelete: "restrict" }),
  gateType: text("gate_type", {
    enum: ["email", "social_follow", "free"]
  }).notNull().default("email"),
  requireEmail: integer("require_email", { mode: "boolean" }).notNull().default(true),
  requireFollow: integer("require_follow", { mode: "boolean" }).notNull().default(false),
  followUrl: text("follow_url"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  downloadCount: integer("download_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
// ===========================================
// DOWNLOAD GATE ACTIONS TABLE
// ===========================================
export const downloadGateActions = sqliteTable("download_gate_actions", {
  id: text("id").primaryKey(),
  downloadGateId: text("download_gate_id").notNull().references(() => downloadGates.id, { onDelete: "cascade" }),
  email: text("email"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  downloadedAt: integer("downloaded_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
// ===========================================
// TYPE EXPORTS
// ===========================================
export type FileAsset = typeof fileAssets.$inferSelect;
export type NewFileAsset = typeof fileAssets.$inferInsert;
export type DownloadGate = typeof downloadGates.$inferSelect;
export type NewDownloadGate = typeof downloadGates.$inferInsert;
export type DownloadGateAction = typeof downloadGateActions.$inferSelect;
export type NewDownloadGateAction = typeof downloadGateActions.$inferInsert;