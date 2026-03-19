import { NextResponse } from "next/server";
import { getClient, initializeDatabase } from "../../../lib/db";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await initializeDatabase();
    const client = await getClient();
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("stats") === "true";
    const today = new Date().toISOString().split("T")[0];
    const result = await client.execute({
      sql: `SELECT * FROM events WHERE is_published = 1 AND event_date >= ? ORDER BY event_date ASC`,
      args: [today],
    });
    const events = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      venue: row.venue,
      city: row.city,
      country: row.country,
      eventDate: row.event_date,
      eventTime: row.event_time,
      ticketUrl: row.ticket_url,
      imageUrl: row.image_url,
      status: row.status,
    }));
    if (includeStats) {
      const statsResult = await client.execute({
        sql: `SELECT COUNT(*) as upcomingEvents FROM events WHERE is_published = 1 AND event_date >= ?`,
        args: [today],
      });
      return NextResponse.json({
        success: true,
        events,
        count: events.length,
        stats: {
          upcomingEvents: Number(statsResult.rows[0]?.upcomingEvents || 0),
        },
      });
    }
    return NextResponse.json({
      success: true,
      events,
      count: events.length,
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
