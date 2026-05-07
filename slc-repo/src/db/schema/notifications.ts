// ===========================================
// PUSH NOTIFICATIONS & A/B TESTING SCHEMA
// ===========================================

import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ===========================================
// PUSH NOTIFICATIONS
// ===========================================

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  endpoint: text("endpoint").notNull().unique(),
  keysP256dh: text("keys_p256dh").notNull(),
  keysAuth: text("keys_auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  lastUsedAt: text("last_used_at").default(sql`(datetime('now'))`),
});

export const notificationPreferences = sqliteTable("notification_preferences", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  subscriptionId: text("subscription_id").notNull().references(() => pushSubscriptions.id, { onDelete: "cascade" }),
  releaseAlerts: integer("release_alerts").default(1),
  presaveReminders: integer("presave_reminders").default(1),
  eventAlerts: integer("event_alerts").default(1),
  newContent: integer("new_content").default(1),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const scheduledNotifications = sqliteTable("scheduled_notifications", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  title: text("title").notNull(),
  body: text("body").notNull(),
  icon: text("icon"),
  url: text("url"),
  scheduledFor: text("scheduled_for").notNull(),
  sentAt: text("sent_at"),
  releaseId: text("release_id"),
  eventId: text("event_id"),
  notificationType: text("notification_type").notNull().default("general"), // release, presave, event, general
  status: text("status").default("pending"), // pending, sent, failed, cancelled
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ===========================================
// A/B TESTING
// ===========================================

export const abTests = sqliteTable("ab_tests", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  name: text("name").notNull(),
  description: text("description"),
  testType: text("test_type").notNull().default("video_template"), // video_template, email_subject, cta_button
  status: text("status").default("active"), // active, paused, completed
  startDate: text("start_date").default(sql`(datetime('now'))`),
  endDate: text("end_date"),
  winnerVariant: text("winner_variant"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const abTestVariants = sqliteTable("ab_test_variants", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  testId: text("test_id").notNull().references(() => abTests.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  variantKey: text("variant_key").notNull(), // e.g., 'countdown', 'vinyl-spin', 'glitch'
  weight: integer("weight").default(50), // percentage weight for random distribution
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const abTestEvents = sqliteTable("ab_test_events", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  testId: text("test_id").notNull().references(() => abTests.id, { onDelete: "cascade" }),
  variantId: text("variant_id").notNull().references(() => abTestVariants.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(), // impression, click, conversion, engagement
  sessionId: text("session_id"),
  userAgent: text("user_agent"),
  metadata: text("metadata"), // JSON for additional data
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ===========================================
// EMAIL MARKETING CAMPAIGNS
// ===========================================

export const emailMarketingCampaigns = sqliteTable("email_marketing_campaigns", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  preheader: text("preheader"),
  body: text("body").notNull(),
  templateType: text("template_type").notNull(), // announcement, reminder, countdown, release, thankyou
  releaseId: text("release_id"),
  mailchimpCampaignId: text("mailchimp_campaign_id"),
  status: text("status").default("draft"), // draft, scheduled, sending, sent, failed
  scheduledFor: text("scheduled_for"),
  sentAt: text("sent_at"),
  recipientCount: integer("recipient_count").default(0),
  openCount: integer("open_count").default(0),
  clickCount: integer("click_count").default(0),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// ===========================================
// RELEASE NOTIFICATION TRACKING
// For tracking which notifications have been sent for upcoming releases
// ===========================================

export const releaseNotifications = sqliteTable("release_notifications", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  releaseId: text("release_id").notNull(),
  notificationType: text("notification_type").notNull(), // 7_days, 24_hours, 1_hour, released
  sentAt: text("sent_at").default(sql`(datetime('now'))`),
  recipientCount: integer("recipient_count").default(0),
});

// ===========================================
// NOTIFICATION HISTORY
// Full history of all sent notifications (manual and automated)
// ===========================================

export const notificationHistory = sqliteTable("notification_history", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  title: text("title").notNull(),
  body: text("body").notNull(),
  url: text("url"),
  type: text("type").notNull().default("manual"), // manual, automated, scheduled
  releaseId: text("release_id"), // Optional link to release
  releaseName: text("release_name"), // Cached for history display
  recipientCount: integer("recipient_count").default(0),
  successCount: integer("success_count").default(0),
  failedCount: integer("failed_count").default(0),
  sentBy: text("sent_by"), // Admin user or "system"
  sentAt: text("sent_at").default(sql`(datetime('now'))`),
  metadata: text("metadata"), // JSON for additional data
});

// ===========================================
// TYPES
// ===========================================

export type ReleaseNotification = typeof releaseNotifications.$inferSelect;
export type NotificationHistoryEntry = typeof notificationHistory.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type ScheduledNotification = typeof scheduledNotifications.$inferSelect;
export type ABTest = typeof abTests.$inferSelect;
export type ABTestVariant = typeof abTestVariants.$inferSelect;
export type ABTestEvent = typeof abTestEvents.$inferSelect;
export type EmailMarketingCampaign = typeof emailMarketingCampaigns.$inferSelect;
