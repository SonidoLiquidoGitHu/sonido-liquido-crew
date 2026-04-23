import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [artistCount, releaseCount, beatCount, subscriberCount, eventCount] =
      await Promise.all([
        db.artist.count(),
        db.release.count(),
        db.beat.count(),
        db.subscriber.count({ where: { status: "active" } }),
        db.event.count({ where: { date: { gte: new Date() } } }),
      ]);

    return NextResponse.json({
      artistCount,
      releaseCount,
      beatCount,
      subscriberCount,
      eventCount,
    });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json(
      { artistCount: 0, releaseCount: 0, beatCount: 0, subscriberCount: 0, eventCount: 0 },
      { status: 500 }
    );
  }
}
