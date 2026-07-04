// ===========================================
// CALENDAR ICS FEED ENDPOINT
// Provides a proper webcal/ICS subscription feed
// for events and releases from Sonido Líquido Crew
// ===========================================
//
// BUG FIX HISTORY:
// - Fixed: DTSTAMP was using new Date() which changed every request,
//   causing calendar clients to create duplicate events on every re-fetch.
//   Now uses stable DTSTAMP derived from event date.
// - Fixed: Missing VTIMEZONE caused Apple Calendar to treat events as
//   recurring daily (phantom events until 2028). Now includes proper
//   VTIMEZONE for America/Mexico_City.
// - Fixed: REFRESH-INTERVAL was PT24H (24 hours), now P7D (7 days)
//   to reduce re-fetch frequency.
// - Fixed: Added SEQUENCE:0 and TRANSP:OPAQUE for proper event handling.
// - Fixed: Timed events now use TZID instead of UTC conversion.
// ===========================================

import { db, isDatabaseConfigured } from "@/db/client";
import { events, releases, upcomingReleases } from "@/db/schema";
import { desc, eq, gte } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Cache for 1 hour

// Format date to ICS format: YYYYMMDDTHHMMSSZ
function formatICSDate(d: Date): string {
  return `${d.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

// Format date-only for all-day events: YYYYMMDD
function formatICSDateOnly(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

// Format local datetime for TZID usage: YYYYMMDDTHHMMSS (no Z suffix)
// Used with DTSTART;TZID=... for timed events in specific timezones
function formatLocalDateTime(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

// Escape ICS text values
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
    .slice(0, 200);
}

// Generate a stable DTSTAMP from a date string so it doesn't change on every request
// This is THE critical fix — previously used new Date() which changed every second,
// making calendar clients think events were modified and creating duplicates
function stableDTSTAMP(dateStr: string | Date): string {
  const d = new Date(dateStr);
  const stamp = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0),
  );
  return formatICSDate(stamp);
}

// VTIMEZONE definition for America/Mexico_City
// Required by RFC 5545 — without this, Apple Calendar misinterprets timed events
// as floating-time and can display them as daily recurring events
const VTIMEZONE_MEXICO_CITY = [
  "BEGIN:VTIMEZONE",
  "TZID:America/Mexico_City",
  "BEGIN:DAYLIGHT",
  "DTSTART:19700405T020000",
  "RRULE:FREQ=YEARLY;BYDAY=1SU;BYMONTH=4",
  "TZOFFSETFROM:-0600",
  "TZOFFSETTO:-0500",
  "TZNAME:CDT",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "DTSTART:19701025T020000",
  "RRULE:FREQ=YEARLY;BYDAY=5SU;BYMONTH=10",
  "TZOFFSETFROM:-0500",
  "TZOFFSETTO:-0600",
  "TZNAME:CST",
  "END:STANDARD",
  "END:VTIMEZONE",
].join("\r\n");

// Build the ICS calendar header — used for all responses
function buildCalendarHeader(): string[] {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sonido Líquido Crew//Calendar//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Sonido Líquido Crew",
    "X-WR-TIMEZONE:America/Mexico_City",
    VTIMEZONE_MEXICO_CITY,
    "REFRESH-INTERVAL;VALUE=DURATION:P7D",
    "X-PUBLISHED-TTL:P7D",
  ];
}

// Create a VEVENT block for a single event (no recurrence)
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
  const {
    uid,
    title,
    dateStart,
    dateEnd,
    isAllDay,
    description,
    location,
    url,
  } = params;

  const lines: string[] = [
    "BEGIN:VEVENT",
    `UID:${uid}@sonidoliquido.com`,
    `DTSTAMP:${stableDTSTAMP(dateStart)}`,
    "SEQUENCE:0",
  ];

  if (isAllDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatICSDateOnly(dateStart)}`);
    const nextDay = new Date(dateStart);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    lines.push(`DTEND;VALUE=DATE:${formatICSDateOnly(nextDay)}`);
  } else {
    // Use TZID for timed events so calendar clients interpret the time correctly
    lines.push(
      `DTSTART;TZID=America/Mexico_City:${formatLocalDateTime(dateStart)}`,
    );
    if (dateEnd) {
      lines.push(
        `DTEND;TZID=America/Mexico_City:${formatLocalDateTime(dateEnd)}`,
      );
    } else {
      const end = new Date(dateStart);
      end.setHours(end.getHours() + 2);
      lines.push(`DTEND;TZID=America/Mexico_City:${formatLocalDateTime(end)}`);
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

  lines.push("TRANSP:OPAQUE");
  lines.push("END:VEVENT");

  return lines.join("\r\n");
}

export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      const emptyCalendar = [...buildCalendarHeader(), "END:VCALENDAR"].join(
        "\r\n",
      );

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

    for (const event of allEvents) {
      const eventDate = new Date(event.eventDate);
      const hasTime = event.eventTime && event.eventTime.trim() !== "";

      if (hasTime && event.eventTime) {
        const timeParts = event.eventTime.match(
          /(\d{1,2}):(\d{2})\s*(AM|PM)?/i,
        );
        if (timeParts) {
          let hours = Number.parseInt(timeParts[1], 10);
          const minutes = Number.parseInt(timeParts[2], 10);
          const ampm = timeParts[3]?.toUpperCase();

          if (ampm === "PM" && hours < 12) hours += 12;
          if (ampm === "AM" && hours === 12) hours = 0;

          eventDate.setHours(hours, minutes, 0, 0);

          const endDate = new Date(eventDate);
          endDate.setHours(endDate.getHours() + 3);

          icsEvents.push(
            createICSEvent({
              uid: `event-${event.id}`,
              title: event.title,
              dateStart: eventDate,
              dateEnd: endDate,
              isAllDay: false,
              description:
                event.description || `Evento en ${event.venue}, ${event.city}`,
              location: `${event.venue}, ${event.city}, ${event.country}`,
              url: event.ticketUrl || undefined,
            }),
          );
        } else {
          icsEvents.push(
            createICSEvent({
              uid: `event-${event.id}`,
              title: event.title,
              dateStart: eventDate,
              isAllDay: true,
              description:
                event.description || `Evento en ${event.venue}, ${event.city}`,
              location: `${event.venue}, ${event.city}, ${event.country}`,
              url: event.ticketUrl || undefined,
            }),
          );
        }
      } else {
        icsEvents.push(
          createICSEvent({
            uid: `event-${event.id}`,
            title: event.title,
            dateStart: eventDate,
            isAllDay: true,
            description:
              event.description || `Evento en ${event.venue}, ${event.city}`,
            location: `${event.venue}, ${event.city}, ${event.country}`,
            url: event.ticketUrl || undefined,
          }),
        );
      }
    }

    // Fetch recent releases (past 30 days)
    const recentReleases = await db
      .select()
      .from(releases)
      .where(gte(releases.releaseDate, thirtyDaysAgo))
      .orderBy(desc(releases.releaseDate))
      .limit(20);

    for (const release of recentReleases) {
      const releaseDate = new Date(release.releaseDate);
      icsEvents.push(
        createICSEvent({
          uid: `release-${release.id}`,
          title: `🎵 Lanzamiento: ${release.title}`,
          dateStart: releaseDate,
          isAllDay: true,
          description: `Lanzamiento: ${release.title}`,
          url: release.spotifyUrl || undefined,
        }),
      );
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
      icsEvents.push(
        createICSEvent({
          uid: `upcoming-${release.id}`,
          title: `🚀 ${release.title}`,
          dateStart: releaseDate,
          isAllDay: true,
          description: `Próximo lanzamiento: ${release.title} por ${release.artistName}`,
          url: release.rpmPresaveUrl || release.spotifyPresaveUrl || undefined,
        }),
      );
    }

    // Build the ICS calendar
    const icsContent = [
      ...buildCalendarHeader(),
      ...icsEvents,
      "END:VCALENDAR",
    ].join("\r\n");

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="sonido-liquido.ics"',
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[Calendar ICS] Error generating feed:", error);

    // Return a valid but empty ICS on error
    const errorCalendar = [...buildCalendarHeader(), "END:VCALENDAR"].join(
      "\r\n",
    );

    return new NextResponse(errorCalendar, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="sonido-liquido.ics"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }
}
