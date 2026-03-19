import { NextResponse } from "next/server";
import { getClient, initializeDatabase } from "../../../../lib/db";
export const dynamic = "force-dynamic";
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}
export async function GET() {
  try {
    await initializeDatabase();
    const client = await getClient();
    const result = await client.execute(
      "SELECT * FROM newsletter_settings LIMIT 1"
    );
    const settings = result.rows[0];
    // Get subscriber count
    const subscriberCount = await client.execute(
      "SELECT COUNT(*) as count FROM newsletter_subscribers WHERE is_active = 1"
    );
    return NextResponse.json({
      success: true,
      settings: settings ? {
        id: settings.id,
        rewardFileUrl: settings.reward_file_url,
        rewardFileName: settings.reward_file_name,
        rewardTitle: settings.reward_title,
        rewardDescription: settings.reward_description,
        popupTitle: settings.popup_title,
        popupDescription: settings.popup_description,
        updatedAt: settings.updated_at,
      } : null,
      subscriberCount: Number(subscriberCount.rows[0]?.count || 0),
    });
  } catch (error) {
    console.error("Error fetching newsletter settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}
export async function POST(request: Request) {
  try {
    const data = await request.json();
    await initializeDatabase();
    const client = await getClient();
    // Check if settings exist
    const existing = await client.execute(
      "SELECT id FROM newsletter_settings LIMIT 1"
    );
    const now = new Date().toISOString();
    if (existing.rows.length > 0) {
      // Update existing settings
      await client.execute({
        sql: `
          UPDATE newsletter_settings SET
            reward_file_url = ?,
            reward_file_name = ?,
            reward_title = ?,
            reward_description = ?,
            popup_title = ?,
            popup_description = ?,
            updated_at = ?
          WHERE id = ?
        `,
        args: [
          data.rewardFileUrl || null,
          data.rewardFileName || null,
          data.rewardTitle || "Exclusive Content",
          data.rewardDescription || "Download our exclusive content as a thank you for subscribing!",
          data.popupTitle || "Join Our Newsletter",
          data.popupDescription || "Get exclusive updates, new releases, and special content delivered to your inbox.",
          now,
          existing.rows[0].id,
        ],
      });
    } else {
      // Create new settings
      const id = generateId();
      await client.execute({
        sql: `
          INSERT INTO newsletter_settings (id, reward_file_url, reward_file_name, reward_title, reward_description, popup_title, popup_description, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          id,
          data.rewardFileUrl || null,
          data.rewardFileName || null,
          data.rewardTitle || "Exclusive Content",
          data.rewardDescription || "Download our exclusive content as a thank you for subscribing!",
          data.popupTitle || "Join Our Newsletter",
          data.popupDescription || "Get exclusive updates, new releases, and special content delivered to your inbox.",
          now,
        ],
      });
    }
    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
    });
  } catch (error) {
    console.error("Error updating newsletter settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
