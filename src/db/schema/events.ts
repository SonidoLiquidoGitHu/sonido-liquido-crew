import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
// ===========================================
// EVENTS TABLE
// ===========================================
export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  venue: text("venue").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull().default("México"),
  eventDate: integer("event_date", { mode: "timestamp" }).notNull(),
  eventTime: text("event_time"),
  ticketUrl: text("ticket_url"),
  imageUrl: text("image_url"),
  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
  isCancelled: integer("is_cancelled", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
// ===========================================
// TYPE EXPORTS
// ===========================================
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;