import { db } from "../src/db/client";
import { sql } from "drizzle-orm";

async function runMigration() {
  console.log("Running new migrations for push notifications and A/B testing...\n");

  const migrations = [
    // Push subscriptions
    `CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      endpoint TEXT NOT NULL UNIQUE,
      keys_p256dh TEXT NOT NULL,
      keys_auth TEXT NOT NULL,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      last_used_at TEXT DEFAULT (datetime('now'))
    )`,

    // Notification preferences
    `CREATE TABLE IF NOT EXISTS notification_preferences (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      subscription_id TEXT NOT NULL,
      release_alerts INTEGER DEFAULT 1,
      presave_reminders INTEGER DEFAULT 1,
      event_alerts INTEGER DEFAULT 1,
      new_content INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,

    // Scheduled notifications
    `CREATE TABLE IF NOT EXISTS scheduled_notifications (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      icon TEXT,
      url TEXT,
      scheduled_for TEXT NOT NULL,
      sent_at TEXT,
      release_id TEXT,
      event_id TEXT,
      notification_type TEXT NOT NULL DEFAULT 'general',
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    )`,

    // A/B Tests
    `CREATE TABLE IF NOT EXISTS ab_tests (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      description TEXT,
      test_type TEXT NOT NULL DEFAULT 'video_template',
      status TEXT DEFAULT 'active',
      start_date TEXT DEFAULT (datetime('now')),
      end_date TEXT,
      winner_variant TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,

    // A/B Test variants
    `CREATE TABLE IF NOT EXISTS ab_test_variants (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      test_id TEXT NOT NULL,
      name TEXT NOT NULL,
      variant_key TEXT NOT NULL,
      weight INTEGER DEFAULT 50,
      created_at TEXT DEFAULT (datetime('now'))
    )`,

    // A/B Test events
    `CREATE TABLE IF NOT EXISTS ab_test_events (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      test_id TEXT NOT NULL,
      variant_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      session_id TEXT,
      user_agent TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,

    // Email marketing campaigns
    `CREATE TABLE IF NOT EXISTS email_marketing_campaigns (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      preheader TEXT,
      body TEXT NOT NULL,
      template_type TEXT NOT NULL,
      release_id TEXT,
      mailchimp_campaign_id TEXT,
      status TEXT DEFAULT 'draft',
      scheduled_for TEXT,
      sent_at TEXT,
      recipient_count INTEGER DEFAULT 0,
      open_count INTEGER DEFAULT 0,
      click_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,

    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint)`,
    `CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled_for ON scheduled_notifications(scheduled_for)`,
    `CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status ON scheduled_notifications(status)`,
    `CREATE INDEX IF NOT EXISTS idx_ab_test_events_test_id ON ab_test_events(test_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ab_test_events_variant_id ON ab_test_events(variant_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ab_test_events_created_at ON ab_test_events(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_email_marketing_campaigns_status ON email_marketing_campaigns(status)`,
    `CREATE INDEX IF NOT EXISTS idx_email_marketing_campaigns_release_id ON email_marketing_campaigns(release_id)`,
  ];

  for (const migration of migrations) {
    try {
      await db.run(sql.raw(migration));
      console.log("✅", migration.split("\n")[0].substring(0, 60) + "...");
    } catch (error: any) {
      if (error.message?.includes("already exists")) {
        console.log("⏭️  Table already exists, skipping...");
      } else {
        console.error("❌ Error:", error.message);
      }
    }
  }

  console.log("\n✅ Migration complete!");
}

runMigration().catch(console.error);
