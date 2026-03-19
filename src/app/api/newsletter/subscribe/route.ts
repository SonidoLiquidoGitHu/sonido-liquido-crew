import { NextResponse } from "next/server";
import { getClient, initializeDatabase } from "../../../../lib/db";
export const dynamic = "force-dynamic";
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}
export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Valid email is required" },
        { status: 400 }
      );
    }
    await initializeDatabase();
    const client = await getClient();
    // Check if already subscribed
    const existing = await client.execute({
      sql: "SELECT id FROM newsletter_subscribers WHERE email = ?",
      args: [email.toLowerCase()],
    });
    if (existing.rows.length > 0) {
      // Get reward info
      const settings = await client.execute(
        "SELECT reward_file_url, reward_file_name, reward_title FROM newsletter_settings LIMIT 1"
      );
      const reward = settings.rows[0];
      return NextResponse.json({
        success: true,
        message: "You're already subscribed!",
        alreadySubscribed: true,
        reward: reward ? {
          fileUrl: reward.reward_file_url,
          fileName: reward.reward_file_name,
          title: reward.reward_title,
        } : null,
      });
    }
    // Insert new subscriber
    const id = generateId();
    await client.execute({
      sql: "INSERT INTO newsletter_subscribers (id, email, name, subscribed_at) VALUES (?, ?, ?, ?)",
      args: [id, email.toLowerCase(), name || null, new Date().toISOString()],
    });
    // Get reward info
    const settings = await client.execute(
      "SELECT reward_file_url, reward_file_name, reward_title FROM newsletter_settings LIMIT 1"
    );
    const reward = settings.rows[0];
    return NextResponse.json({
      success: true,
      message: "Successfully subscribed!",
      reward: reward ? {
        fileUrl: reward.reward_file_url,
        fileName: reward.reward_file_name,
        title: reward.reward_title,
      } : null,
    });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}
