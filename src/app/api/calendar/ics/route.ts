// ===========================================
// CALENDAR ICS FEED ENDPOINT
// Provides a proper webcal/ICS subscription feed
// for events and releases from Sonido Líquido Crew
// ===========================================

import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { events, releases, upcomingReleases, artists } from "@/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Cache for 1 hour

// Format date to ICS format: YYYYMMDDTHHMMSSZ
function formatICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

// Format date-only for all-day events: YYYYMMDD
function formatICSDateOnly(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

// Escape ICS text values
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
    .slice(0, 200); // Limit length for safety
}

// Create a VEVENT block for a single event
function createICSEvent(params: {
  uid: string;
  title: string;
  dateStart: Date;
  dateEnd?: Date;
  isAllDay?: boolean;
  description?: string;
  location?: string;
  url?: string;
}): string {
  const { uid, title, dateStart, dateEnd, isAllDay, description, location, url } = params;

  const lines: string[] = [
    "BEGIN:VEVENT",
    `UID:${uid}@sonidoliquido.com`,
    `DTSTAMP:${formatICSDate(new Date())}`,
  ];

  if (isAllDay) {
    // All-day event format (no time component)
    lines.push(`DTSTART;VALUE=DATE:${formatICSDateOnly(dateStart)}`);
    // End date for all-day events is exclusive (next day)
    const nextDay = new Date(dateStart);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    lines.push(`DTEND;VALUE=DATE:${formatICSDateOnly(nextDay)}`);
  } else {
    lines.push(`DTSTART:${formatICSDate(dateStart)}`);
    if (dateEnd) {
      lines.push(`DTEND:${formatICSDate(dateEnd)}`);
    } else {
      // Default 2-hour duration for timed events
      const end = new Date(dateStart);
      end.setUTCHours(end.getUTCHours() + 2);
      lines.push(`DTEND:${formatICSDate(end)}`);
    }
  }

  lines.push(`SUMMARY:${escapeICS(title)}`);

  if (description) {
    lines.push(`DESCRIPTION:${escapeICS(description)}`);
  }

  if (location) {
    lines.push(`LOCATION:${escapeICS(location)}`);
  }

  if (url) {
    lines.push(`URL:${url}`);
  }

  // No recurrence - each event is a single occurrence
  lines.push("END:VEVENT");

  return lines.join("\r\n");
}

export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      // Return an empty but valid ICS calendar
      const emptyCalendar = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Sonido Líquido Crew//Calendar//ES",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Sonido Líquido Crew",
        "X-WR-TIMEZONE:America/Mexico_City",
        "REFRESH-INTERVAL;VALUE=DURATION:PT24H",
        "X-PUBLISHED-TTL:PT24H",
        "END:VCALENDAR",
      ].join("\r\n");

      return new NextResponse(emptyCalendar, {
        status: 200,
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": 'attachment; filename="sonido-liquido.ics"',
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    const icsEvents: string[] = [];

    // Fetch future events (upcoming + past 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const allEvents = await db
      .select()
      .from(events)
      .where(gte(events.eventDate, thirtyDaysAgo))
      .orderBy(events.eventDate);

    // Add events to ICS
    for (const event of allEvents) {
      const eventDate = new Date(event.eventDate);
      const hasTime = event.eventTime && event.eventTime.trim() !== "";

      if (hasTime && event.eventTime) {
        // Parse time string (e.g., "21:00" or "9:00 PM")
        const timeParts = event.eventTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (timeParts) {
          let hours = parseInt(timeParts[1], 10);
          const minutes = parseInt(timeParts[2], 10);
          const ampm = timeParts[3]?.toUpperCase();

          if (ampm === "PM" && hours < 12) hours += 12;
          if (ampm === "AM" && hours === 12) hours = 0;

          eventDate.setHours(hours, minutes, 0, 0);

          const endDate = new Date(eventDate);
          endDate.setHours(endDate.getHours() + 3); // Default 3h for concerts

          icsEvents.push(createICSEvent({
            uid: `event-${event.id}`,
            title: event.title,
            dateStart: eventDate,
            dateEnd: endDate,
            isAllDay: false,
            description: event.description || `Evento en ${event.venue}, ${event.city}`,
            location: `${event.venue}, ${event.city}, ${event.country}`,
            url: event.ticketUrl || undefined,
          }));
        } else {
          // Fallback to all-day if time can't be parsed
          icsEvents.push(createICSEvent({
            uid: `event-${event.id}`,
            title: event.title,
            dateStart: eventDate,
            isAllDay: true,
            description: event.description || `Evento en ${event.venue}, ${event.city}`,
            location: `${event.venue}, ${event.city}, ${event.country}`,
            url: event.ticketUrl || undefined,
          }));
        }
      } else {
        // All-day event
        icsEvents.push(createICSEvent({
          uid: `event-${event.id}`,
          title: event.title,
          dateStart: eventDate,
          isAllDay: true,
          description: event.description || `Evento en ${event.venue}, ${event.city}`,
          location: `${event.venue}, ${event.city}, ${event.country}`,
          url: event.ticketUrl || undefined,
        }));
      }
    }

    // Fetch recent releases (past 30 days + next 30 days)
    const recentReleases = await db
      .select()
      .from(releases)
      .where(gte(releases.releaseDate, thirtyDaysAgo))
      .orderBy(desc(releases.releaseDate))
      .limit(20);

    // Add releases as all-day events
    for (const release of recentReleases) {
      const releaseDate = new Date(release.releaseDate);
      icsEvents.push(createICSEvent({
        uid: `release-${release.id}`,
        title: `🎵 Lanzamiento: ${release.title}`,
        dateStart: releaseDate,
        isAllDay: true,
        description: `Lanzamiento: ${release.title}`,
        url: release.spotifyUrl || undefined,
      }));
    }

    // Fetch upcoming releases
    const upcomingReleasesList = await db
      .select()
      .from(upcomingReleases)
      .where(eq(upcomingReleases.isActive, true))
      .orderBy(upcomingReleases.releaseDate)
      .limit(10);

    for (const release of upcomingReleasesList) {
      const releaseDate = new Date(release.releaseDate);
      icsEvents.push(createICSEvent({
        uid: `upcoming-${release.id}`,
        title: `🚀 ${release.title}`,
        dateStart: releaseDate,
        isAllDay: true,
        description: `Próximo lanzamiento: ${release.title} por ${release.artistName}`,
        url: release.rpmPresaveUrl || release.spotifyPresaveUrl || undefined,
      }));
    }

    // Build the ICS calendar
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Sonido Líquido Crew//Calendar//ES",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Sonido Líquido Crew",
      "X-WR-TIMEZONE:America/Mexico_City",
      "REFRESH-INTERVAL;VALUE=DURATION:PT24H",
      "X-PUBLISHED-TTL:PT24H",
      ...icsEvents,
      "END:VCALENDAR",
    ].join("\r\n");

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="sonido-liquido.ics"',
        "Cache-Control": "public, max-age=3600", // Cache 1 hour
      },
    });
  } catch (error) {
    console.error("[Calendar ICS] Error generating feed:", error);

    // Return a valid but empty ICS on error (so phone doesn't create phantom events)
    const errorCalendar = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Sonido Líquido Crew//Calendar//ES",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Sonido Líquido Crew",
      "X-WR-TIMEZONE:America/Mexico_City",
      "REFRESH-INTERVAL;VALUE=DURATION:PT24H",
      "X-PUBLISHED-TTL:PT24H",
      "END:VCALENDAR",
    ].join("\r\n");

    return new NextResponse(errorCalendar, {
      status: 200, // Return 200 even on error so phone doesn't create phantom events
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="sonido-liquido.ics"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }
}
