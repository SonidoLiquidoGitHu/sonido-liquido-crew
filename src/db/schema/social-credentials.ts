import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ===========================================
// SOCIAL CREDENTIALS TABLE
// ===========================================
// Stores API credentials for social platforms (Meta, etc.)
// These are read by the social clients as a fallback when env vars are not set.
// Credentials stored here take priority over environment variables.

export const socialCredentials = sqliteTable("social_credentials", {
  id: text("id").primaryKey(),

  // Which platform these credentials belong to
  platform: text("platform", {
    enum: ["meta"],
  }).notNull(),

  // The credential key name (e.g., "META_APP_ID")
  key: text("key").notNull(),

  // The encrypted/masked credential value
  value: text("value").notNull(),

  // Whether this credential was set via the UI (true) or inherited from env var (false)
  isFromUi: integer("is_from_ui", { mode: "boolean" })
    .notNull()
    .default(true),

  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ===========================================
// TYPE EXPORTS
// ===========================================

export type SocialCredential = typeof socialCredentials.$inferSelect;
export type NewSocialCredential = typeof socialCredentials.$inferInsert;
