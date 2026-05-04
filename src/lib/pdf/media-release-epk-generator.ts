/**
 * Media Release EPK PDF Generator
 *
 * Generates a professional Electronic Press Kit PDF for a media release,
 * combining the release info with the associated artist's EPK data.
 */

import { jsPDF } from "jspdf";
// @ts-ignore - jspdf-autotable extends jsPDF prototype
import "jspdf-autotable";

// ===========================================
// INTERFACES
// ===========================================

interface AudioTrack {
  title: string;
  artist?: string;
  url?: string;
  duration: string;
  trackNumber: number;
}

interface PressQuote {
  quote: string;
  source: string;
  sourceUrl?: string;
}

interface SocialProfile {
  platform: string;
  url: string;
  handle?: string | null;
}

interface Collaboration {
  artistName: string;
  trackName: string;
  year: number;
  type: string;
}

interface ArtistEpkData {
  name: string;
  slug: string;
  role: string;
  profileImageUrl?: string | null;
  bannerImageUrl?: string | null;
  location?: string | null;
  bio?: string | null;
  shortBio?: string | null;
  tagline?: string | null;
  genreSpecific?: string | null;
  subgenres?: string[];
  artistType?: string | null;

  // Streaming stats
  spotifyMonthlyListeners?: number | null;
  spotifyFollowers?: number | null;
  youtubeSubscribers?: number | null;
  instagramFollowers?: number | null;
  totalStreams?: number | null;

  // Press & media
  pressQuotes?: PressQuote[];
  pressFeatures?: { outlet: string; title: string; url?: string; date?: string }[];

  // Music
  topTracks?: { title: string; url?: string; platform: string }[];

  // Collaborations
  collaborations?: Collaboration[];

  // Shows
  pastShows?: { venue: string; city: string; date: string; type: string }[];
  festivalAppearances?: string[];
  notableVenues?: string[];

  // Contact
  bookingEmail?: string | null;
  managementEmail?: string | null;
  managementName?: string | null;
  publicistEmail?: string | null;
  publicistName?: string | null;

  // Social profiles
  socialProfiles?: SocialProfile[];
}

interface MediaReleaseData {
  id: string;
  title: string;
  slug: string;
  subtitle?: string | null;
  category: string;
  summary?: string | null;
  content?: string | null;
  pullQuote?: string | null;
  pullQuoteAttribution?: string | null;
  coverImageUrl?: string | null;
  bannerImageUrl?: string | null;
  audioTracks?: AudioTrack[];
  spotifyEmbedUrl?: string | null;
  youtubeVideoId?: string | null;
  youtubeVideoTitle?: string | null;
  credits?: string | null;
  tags?: string[];
  publishDate: string;
  releaseDate?: string | null;

  // PR Contact
  prContactName?: string | null;
  prContactEmail?: string | null;
  prContactPhone?: string | null;

  // Related artist
  artistName?: string | null;
  artist?: ArtistEpkData | null;
}

// ===========================================
// COLORS
// ===========================================

const COLORS = {
  primary: "#E85D04",       // SLC Orange
  secondary: "#1DB954",     // Spotify green
  dark: "#0D0D0D",
  darker: "#080808",
  text: "#FFFFFF",
  textSecondary: "#CCCCCC",
  muted: "#888888",
  accent: "#F97316",        // Orange lighter
  card: "#1A1A1A",
  cardBorder: "#2A2A2A",
  sectionBg: "#111111",
};

const CATEGORY_LABELS: Record<string, string> = {
  new_release: "Nuevo Lanzamiento",
  single: "Single",
  album: "Album",
  ep: "EP",
  tour: "Gira / Tour",
  collaboration: "Colaboracion",
  event: "Evento",
  announcement: "Anuncio",
  interview: "Entrevista",
  feature: "Feature / Articulo",
};

// ===========================================
// HELPERS
// ===========================================

function formatNumber(num: number | null | undefined): string {
  if (!num) return "0";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toLocaleString();
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/#{1,6}\s/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n");
}

function getPlatformLabel(platform: string): string {
  const labels: Record<string, string> = {
    spotify: "Spotify",
    instagram: "Instagram",
    youtube: "YouTube",
    tiktok: "TikTok",
    twitter: "X / Twitter",
    facebook: "Facebook",
    soundcloud: "SoundCloud",
    apple_music: "Apple Music",
  };
  return labels[platform] || platform;
}

// ===========================================
// PDF GENERATOR
// ===========================================

export async function generateMediaReleaseEpkPDF(data: MediaReleaseData): Promise<Uint8Array> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let yPos = 0;

  // Track current page for footers
  let pageNumber = 1;

  const checkPageBreak = (requiredHeight: number): boolean => {
    if (yPos + requiredHeight > pageHeight - 25) {
      // Add footer before new page
      addFooter();
      doc.addPage();
      pageNumber++;
      yPos = margin;
      // Add subtle top bar on new pages
      doc.setFillColor(COLORS.primary);
      doc.rect(0, 0, pageWidth, 1.5, "F");
      return true;
    }
    return false;
  };

  const addFooter = () => {
    const footerY = pageHeight - 12;
    doc.setDrawColor(COLORS.cardBorder);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(COLORS.muted);
    doc.text(
      `${data.artistName || "Sonido Liquido Crew"} - EPK | ${data.title}`,
      margin,
      footerY
    );
    doc.text(
      `Pagina ${pageNumber}`,
      pageWidth - margin,
      footerY,
      { align: "right" }
    );
  };

  // Section header with accent bar
  const drawSectionHeader = (title: string, accentColor: string = COLORS.primary) => {
    checkPageBreak(20);
    // Accent bar
    doc.setFillColor(accentColor);
    doc.rect(margin, yPos, 3, 8, "F");
    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(COLORS.text);
    doc.text(title.toUpperCase(), margin + 7, yPos + 6);
    yPos += 14;
  };

  // ===========================================
  // PAGE 1: COVER / HERO
  // ===========================================

  // Full dark background header area
  doc.setFillColor(COLORS.darker);
  doc.rect(0, 0, pageWidth, 90, "F");

  // Orange accent gradient at top
  doc.setFillColor(COLORS.primary);
  doc.rect(0, 0, pageWidth, 2, "F");

  // "EPK" badge
  doc.setFillColor(COLORS.primary);
  doc.roundedRect(pageWidth - margin - 28, 12, 28, 10, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor("#FFFFFF");
  doc.text("EPK", pageWidth - margin - 14, 18.5, { align: "center" });

  // Artist name (if available)
  yPos = 18;
  if (data.artistName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(COLORS.accent);
    doc.text(data.artistName.toUpperCase(), margin, yPos);
    yPos += 10;
  }

  // Release title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(COLORS.text);
  const titleLines = doc.splitTextToSize(data.title.toUpperCase(), contentWidth - 35);
  titleLines.slice(0, 2).forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 12;
  });

  // Subtitle
  if (data.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(COLORS.accent);
    doc.text(data.subtitle, margin, yPos);
    yPos += 8;
  }

  // Category badge + date
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(COLORS.primary);
  const categoryLabel = CATEGORY_LABELS[data.category] || data.category;
  const publishDate = formatDate(data.publishDate);
  doc.text(`${categoryLabel}${publishDate ? `  |  ${publishDate}` : ""}`, margin, yPos);

  yPos = 100;

  // ===========================================
  // QUICK STATS BAR
  // ===========================================

  if (data.artist) {
    const stats: { value: string; label: string }[] = [];

    if (data.artist.spotifyMonthlyListeners) {
      stats.push({ value: formatNumber(data.artist.spotifyMonthlyListeners), label: "OYENTES/MES" });
    }
    if (data.artist.totalStreams) {
      stats.push({ value: formatNumber(data.artist.totalStreams), label: "STREAMS" });
    }
    if (data.artist.instagramFollowers) {
      stats.push({ value: formatNumber(data.artist.instagramFollowers), label: "INSTAGRAM" });
    }
    if (data.artist.youtubeSubscribers) {
      stats.push({ value: formatNumber(data.artist.youtubeSubscribers), label: "YOUTUBE" });
    }

    if (stats.length > 0) {
      const statsBoxWidth = (contentWidth - (stats.length - 1) * 4) / stats.length;

      stats.forEach((stat, index) => {
        const xPos = margin + index * (statsBoxWidth + 4);

        doc.setFillColor(COLORS.card);
        doc.roundedRect(xPos, yPos, statsBoxWidth, 22, 2, 2, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(COLORS.primary);
        doc.text(stat.value, xPos + statsBoxWidth / 2, yPos + 10, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(COLORS.muted);
        doc.text(stat.label, xPos + statsBoxWidth / 2, yPos + 17, { align: "center" });
      });

      yPos += 30;
    }
  }

  // ===========================================
  // SUMMARY / RESUMEN
  // ===========================================

  if (data.summary) {
    drawSectionHeader("Resumen para Medios");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(COLORS.textSecondary);

    const summaryLines = doc.splitTextToSize(data.summary, contentWidth);
    summaryLines.forEach((line: string) => {
      checkPageBreak(6);
      doc.text(line, margin, yPos);
      yPos += 5;
    });
    yPos += 6;
  }

  // ===========================================
  // PULL QUOTE
  // ===========================================

  if (data.pullQuote) {
    checkPageBreak(30);

    // Quote box with accent border
    doc.setFillColor(COLORS.card);
    const quoteLines = doc.splitTextToSize(`"${data.pullQuote}"`, contentWidth - 20);
    const quoteHeight = quoteLines.length * 5 + 18;
    doc.roundedRect(margin, yPos, contentWidth, quoteHeight, 2, 2, "F");

    // Left accent bar
    doc.setFillColor(COLORS.primary);
    doc.rect(margin, yPos, 2, quoteHeight, "F");

    // Quote text
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(COLORS.text);

    let quoteY = yPos + 8;
    quoteLines.forEach((line: string) => {
      doc.text(line, margin + 10, quoteY);
      quoteY += 5;
    });

    // Attribution
    if (data.pullQuoteAttribution) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(COLORS.primary);
      doc.text(`-- ${data.pullQuoteAttribution}`, margin + 10, quoteY + 3);
    }

    yPos += quoteHeight + 8;
  }

  // ===========================================
  // ARTIST BIO
  // ===========================================

  if (data.artist && (data.artist.bio || data.artist.shortBio)) {
    drawSectionHeader("Biografia del Artista");

    // Tagline
    if (data.artist.tagline) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(COLORS.accent);
      doc.text(data.artist.tagline, margin, yPos);
      yPos += 7;
    }

    // Genre tags
    if (data.artist.genreSpecific || (data.artist.subgenres && data.artist.subgenres.length > 0)) {
      const genres = [
        data.artist.genreSpecific,
        ...(data.artist.subgenres || []),
      ].filter(Boolean);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(COLORS.muted);
      doc.text(`Generos: ${genres.join(" | ")}`, margin, yPos);
      yPos += 7;
    }

    // Bio
    const bio = data.artist.shortBio || data.artist.bio;
    if (bio) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(COLORS.textSecondary);

      const cleanBio = cleanMarkdown(bio);
      const bioLines = doc.splitTextToSize(cleanBio, contentWidth);
      bioLines.forEach((line: string) => {
        checkPageBreak(5);
        doc.text(line, margin, yPos);
        yPos += 4.5;
      });
    }

    yPos += 8;
  }

  // ===========================================
  // TRACKLIST
  // ===========================================

  if (data.audioTracks && data.audioTracks.length > 0) {
    checkPageBreak(30);
    drawSectionHeader("Tracklist");

    // Table header
    doc.setFillColor(COLORS.card);
    doc.rect(margin, yPos, contentWidth, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(COLORS.muted);
    doc.text("#", margin + 3, yPos + 5.5);
    doc.text("TITULO", margin + 12, yPos + 5.5);
    doc.text("DURACION", pageWidth - margin - 20, yPos + 5.5);
    yPos += 10;

    // Track rows
    data.audioTracks.forEach((track, index) => {
      checkPageBreak(8);

      if (index % 2 === 0) {
        doc.setFillColor(COLORS.sectionBg);
        doc.rect(margin, yPos - 3, contentWidth, 7, "F");
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(COLORS.muted);
      doc.text(`${track.trackNumber || index + 1}`, margin + 4, yPos);

      doc.setTextColor(COLORS.text);
      doc.text(track.title, margin + 12, yPos);

      doc.setTextColor(COLORS.muted);
      doc.text(track.duration || "--:--", pageWidth - margin - 5, yPos, { align: "right" });

      yPos += 7;
    });

    yPos += 8;
  }

  // ===========================================
  // PRESS CONTENT (FULL PRESS RELEASE)
  // ===========================================

  if (data.content) {
    checkPageBreak(25);
    drawSectionHeader("Comunicado de Prensa");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(COLORS.textSecondary);

    const cleanContent = cleanMarkdown(data.content);
    const contentLines = doc.splitTextToSize(cleanContent, contentWidth);
    contentLines.forEach((line: string) => {
      checkPageBreak(5);
      doc.text(line, margin, yPos);
      yPos += 4.5;
    });

    yPos += 8;
  }

  // ===========================================
  // CREDITS
  // ===========================================

  if (data.credits) {
    checkPageBreak(25);
    drawSectionHeader("Creditos");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(COLORS.textSecondary);

    const cleanCredits = cleanMarkdown(data.credits);
    const creditLines = doc.splitTextToSize(cleanCredits, contentWidth);
    creditLines.forEach((line: string) => {
      checkPageBreak(5);
      doc.text(line, margin, yPos);
      yPos += 4.5;
    });

    yPos += 8;
  }

  // ===========================================
  // PRESS QUOTES (from artist EPK)
  // ===========================================

  if (data.artist?.pressQuotes && data.artist.pressQuotes.length > 0) {
    checkPageBreak(30);
    drawSectionHeader("Citas de Prensa");

    data.artist.pressQuotes.slice(0, 4).forEach((quote) => {
      checkPageBreak(25);

      const quoteLines = doc.splitTextToSize(`"${quote.quote}"`, contentWidth - 16);
      const quoteHeight = quoteLines.length * 4.5 + 12;

      // Quote box
      doc.setFillColor(COLORS.card);
      doc.roundedRect(margin, yPos, contentWidth, quoteHeight, 2, 2, "F");

      // Accent bar
      doc.setFillColor(COLORS.secondary);
      doc.rect(margin, yPos, 2, quoteHeight, "F");

      // Quote text
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(COLORS.text);

      let quoteY = yPos + 6;
      quoteLines.forEach((line: string) => {
        doc.text(line, margin + 8, quoteY);
        quoteY += 4.5;
      });

      // Source
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(COLORS.secondary);
      doc.text(`-- ${quote.source}`, margin + 8, quoteY + 2);

      yPos += quoteHeight + 5;
    });

    yPos += 5;
  }

  // ===========================================
  // COLLABORATIONS
  // ===========================================

  if (data.artist?.collaborations && data.artist.collaborations.length > 0) {
    checkPageBreak(25);
    drawSectionHeader("Colaboraciones Destacadas");

    const collabs = data.artist.collaborations.slice(0, 6);

    // Two-column layout
    const colWidth = (contentWidth - 6) / 2;
    let col = 0;
    let rowY = yPos;

    collabs.forEach((collab, index) => {
      const xPos = margin + col * (colWidth + 6);

      if (col === 0 && index > 0) {
        checkPageBreak(18);
        rowY = yPos;
      }

      // Collab box
      doc.setFillColor(COLORS.card);
      doc.roundedRect(xPos, rowY, colWidth, 16, 2, 2, "F");

      // Artist name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(COLORS.text);
      doc.text(collab.artistName, xPos + 4, rowY + 6);

      // Track + year
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(COLORS.muted);
      doc.text(`"${collab.trackName}" (${collab.year})`, xPos + 4, rowY + 12);

      col++;
      if (col >= 2) {
        col = 0;
        yPos = rowY + 20;
      }
    });

    if (col !== 0) {
      yPos = rowY + 20;
    }
    yPos += 5;
  }

  // ===========================================
  // SHOWS & FESTIVALS
  // ===========================================

  if (data.artist && (data.artist.festivalAppearances?.length || data.artist.notableVenues?.length)) {
    checkPageBreak(25);
    drawSectionHeader("Shows & Festivales");

    if (data.artist.festivalAppearances && data.artist.festivalAppearances.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(COLORS.muted);
      doc.text("Festivales:", margin, yPos);
      yPos += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(COLORS.text);
      const festivalText = data.artist.festivalAppearances.slice(0, 8).join(" | ");
      const festivalLines = doc.splitTextToSize(festivalText, contentWidth);
      festivalLines.forEach((line: string) => {
        checkPageBreak(5);
        doc.text(line, margin, yPos);
        yPos += 5;
      });
      yPos += 3;
    }

    if (data.artist.notableVenues && data.artist.notableVenues.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(COLORS.muted);
      doc.text("Venues Notables:", margin, yPos);
      yPos += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(COLORS.text);
      const venueText = data.artist.notableVenues.slice(0, 8).join(" | ");
      const venueLines = doc.splitTextToSize(venueText, contentWidth);
      venueLines.forEach((line: string) => {
        checkPageBreak(5);
        doc.text(line, margin, yPos);
        yPos += 5;
      });
      yPos += 3;
    }

    yPos += 5;
  }

  // ===========================================
  // SOCIAL LINKS
  // ===========================================

  if (data.artist?.socialProfiles && data.artist.socialProfiles.length > 0) {
    checkPageBreak(20);
    drawSectionHeader("Redes Sociales");

    const profiles = data.artist.socialProfiles;
    const profileColWidth = (contentWidth - 6) / 2;
    let profileCol = 0;
    let profileRowY = yPos;

    profiles.forEach((profile, index) => {
      const xPos = margin + profileCol * (profileColWidth + 6);

      if (profileCol === 0 && index > 0) {
        checkPageBreak(12);
        profileRowY = yPos;
      }

      // Social box
      doc.setFillColor(COLORS.card);
      doc.roundedRect(xPos, profileRowY, profileColWidth, 10, 2, 2, "F");

      // Platform name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(COLORS.primary);
      doc.text(getPlatformLabel(profile.platform), xPos + 4, profileRowY + 6.5);

      // Handle
      if (profile.handle) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(COLORS.muted);
        doc.text(profile.handle, xPos + profileColWidth - 4, profileRowY + 6.5, { align: "right" });
      }

      profileCol++;
      if (profileCol >= 2) {
        profileCol = 0;
        yPos = profileRowY + 13;
      }
    });

    if (profileCol !== 0) {
      yPos = profileRowY + 13;
    }
    yPos += 5;
  }

  // ===========================================
  // CONTACT INFO
  // ===========================================

  checkPageBreak(50);
  drawSectionHeader("Contacto");

  const contactItems: { label: string; value: string }[] = [];

  // PR contact from media release
  if (data.prContactName) contactItems.push({ label: "Contacto de Prensa", value: data.prContactName });
  if (data.prContactEmail) contactItems.push({ label: "Email Prensa", value: data.prContactEmail });
  if (data.prContactPhone) contactItems.push({ label: "Telefono Prensa", value: data.prContactPhone });

  // Artist contacts from EPK
  if (data.artist?.bookingEmail) contactItems.push({ label: "Booking", value: data.artist.bookingEmail });
  if (data.artist?.managementEmail) {
    contactItems.push({
      label: `Management${data.artist.managementName ? ` (${data.artist.managementName})` : ""}`,
      value: data.artist.managementEmail,
    });
  }
  if (data.artist?.publicistEmail) {
    contactItems.push({
      label: `Publicista${data.artist.publicistName ? ` (${data.artist.publicistName})` : ""}`,
      value: data.artist.publicistEmail,
    });
  }

  // Default SLC contact
  contactItems.push({ label: "Sonido Liquido Crew", value: "prensasonidoliquido@gmail.com" });

  // Remove duplicate emails
  const seenEmails = new Set<string>();
  const uniqueContacts = contactItems.filter(item => {
    if (item.value.includes("@") && seenEmails.has(item.value.toLowerCase())) return false;
    if (item.value.includes("@")) seenEmails.add(item.value.toLowerCase());
    return true;
  });

  uniqueContacts.forEach((contact) => {
    checkPageBreak(8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(COLORS.muted);
    doc.text(contact.label + ":", margin, yPos);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(COLORS.text);
    doc.text(contact.value, margin + 40, yPos);

    yPos += 7;
  });

  yPos += 5;

  // ===========================================
  // SLC BRANDING FOOTER
  // ===========================================

  // Add footer to last page
  addFooter();

  // Final branding bar at very bottom
  const finalY = pageHeight - 6;
  doc.setFillColor(COLORS.primary);
  doc.rect(0, pageHeight - 3, pageWidth, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(COLORS.primary);
  doc.text(
    "SONIDO LIQUIDO CREW  |  www.sonidoliquido.com  |  Est. 1999, Ciudad de Mexico",
    pageWidth / 2,
    finalY,
    { align: "center" }
  );

  // Return as Uint8Array
  const arrayBuffer = doc.output("arraybuffer");
  return new Uint8Array(arrayBuffer);
}

// ===========================================
// FILENAME GENERATOR
// ===========================================

export function generateMediaReleaseEpkFilename(title: string, artistName?: string | null): string {
  const date = new Date().toISOString().split("T")[0];
  const slug = [artistName, title]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${slug}-epk-${date}.pdf`;
}
