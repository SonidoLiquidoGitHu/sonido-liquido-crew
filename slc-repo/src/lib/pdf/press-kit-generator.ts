/**
 * Press Kit PDF Generator
 *
 * Generates a professional PDF press kit from the stored press kit data
 * Now with optional live Spotify data integration
 */

import { jsPDF } from "jspdf";
// @ts-ignore - jspdf-autotable extends jsPDF prototype
import "jspdf-autotable";

interface KeyPoint {
  icon: string;
  title: string;
  description: string;
}

interface DownloadItem {
  name: string;
  url: string;
  description: string;
}

interface PressQuote {
  quote: string;
  source: string;
  url?: string;
}

interface SpotifyArtistData {
  name: string;
  monthlyListeners?: number;
  followers?: number;
  popularity?: number;
  genres?: string[];
  imageUrl?: string;
}

interface PressKitData {
  heroTitle: string;
  heroSubtitle: string;
  heroTagline: string;
  heroCoverImageUrl?: string;
  heroBannerImageUrl?: string;
  statsArtists: string;
  statsReleases: string;
  statsYears: string;
  aboutTitle: string;
  aboutContent: string;
  keyPoints: KeyPoint[];
  contactEmail: string;
  contactPhone: string;
  contactLocation: string;
  spotifyUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  twitterUrl?: string;
  facebookUrl?: string;
  downloads: DownloadItem[];
  pressQuotes: PressQuote[];
  featuredVideoUrl?: string;
  featuredVideoTitle?: string;
  footerCtaTitle?: string;
  footerCtaButtonText?: string;
  // Live data
  spotifyArtists?: SpotifyArtistData[];
  generatedAt?: string;
  includesLiveData?: boolean;
}

// Colors matching the site theme
const COLORS = {
  primary: "#E85D04", // Orange
  secondary: "#1DB954", // Spotify green
  dark: "#0D0D0D",
  text: "#333333",
  muted: "#666666",
  light: "#F5F5F5",
  live: "#22C55E", // Green for live data indicator
};

export async function generatePressKitPDF(data: PressKitData): Promise<Uint8Array> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Helper function to add a new page if needed
  const checkPageBreak = (requiredHeight: number) => {
    if (yPos + requiredHeight > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Helper to draw section header
  const drawSectionHeader = (title: string, color: string = COLORS.primary) => {
    checkPageBreak(20);
    doc.setFillColor(color);
    doc.rect(margin, yPos, 4, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(COLORS.text);
    doc.text(title.toUpperCase(), margin + 8, yPos + 7);
    yPos += 15;
  };

  // =====================
  // PAGE 1: Cover
  // =====================

  // Header bar
  doc.setFillColor(COLORS.dark);
  doc.rect(0, 0, pageWidth, 60, "F");

  // Live data badge (if applicable)
  if (data.includesLiveData) {
    doc.setFillColor(COLORS.live);
    doc.roundedRect(pageWidth - 50, 5, 45, 8, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor("#FFFFFF");
    doc.text("● DATOS EN VIVO", pageWidth - 48, 10);
  }

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.setTextColor("#FFFFFF");
  doc.text(data.heroTitle.toUpperCase(), pageWidth / 2, 30, { align: "center" });

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(COLORS.primary);
  doc.text(data.heroSubtitle, pageWidth / 2, 42, { align: "center" });

  // Tagline
  doc.setFontSize(10);
  doc.setTextColor("#CCCCCC");
  doc.text(data.heroTagline, pageWidth / 2, 52, { align: "center" });

  yPos = 75;

  // Stats boxes
  const statsBoxWidth = (contentWidth - 20) / 3;
  const stats = [
    { value: data.statsArtists, label: "ARTISTAS" },
    { value: data.statsReleases, label: "LANZAMIENTOS" },
    { value: data.statsYears, label: "AÑOS" },
  ];

  stats.forEach((stat, index) => {
    const xPos = margin + index * (statsBoxWidth + 10);

    // Box background
    doc.setFillColor(COLORS.light);
    doc.roundedRect(xPos, yPos, statsBoxWidth, 30, 3, 3, "F");

    // Value
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(COLORS.primary);
    doc.text(stat.value, xPos + statsBoxWidth / 2, yPos + 15, { align: "center" });

    // Label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(COLORS.muted);
    doc.text(stat.label, xPos + statsBoxWidth / 2, yPos + 24, { align: "center" });
  });

  yPos += 45;

  // About section
  drawSectionHeader(data.aboutTitle);

  if (data.aboutContent) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(COLORS.text);

    // Remove markdown formatting for PDF
    const cleanContent = data.aboutContent
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/\n\n/g, "\n");

    const lines = doc.splitTextToSize(cleanContent, contentWidth);

    lines.forEach((line: string) => {
      checkPageBreak(6);
      doc.text(line, margin, yPos);
      yPos += 5;
    });

    yPos += 10;
  }

  // Key Points
  if (data.keyPoints && data.keyPoints.length > 0) {
    drawSectionHeader("PUNTOS CLAVE");

    data.keyPoints.forEach((point) => {
      checkPageBreak(20);

      // Bullet point
      doc.setFillColor(COLORS.primary);
      doc.circle(margin + 2, yPos - 1, 2, "F");

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(COLORS.text);
      doc.text(point.title, margin + 8, yPos);

      // Description
      if (point.description) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(COLORS.muted);
        const descLines = doc.splitTextToSize(point.description, contentWidth - 10);
        yPos += 5;
        descLines.forEach((line: string) => {
          doc.text(line, margin + 8, yPos);
          yPos += 4;
        });
      }

      yPos += 5;
    });

    yPos += 5;
  }

  // =====================
  // SPOTIFY ARTISTS SECTION (if live data)
  // =====================

  if (data.spotifyArtists && data.spotifyArtists.length > 0) {
    checkPageBreak(60);
    drawSectionHeader("ROSTER DE ARTISTAS", COLORS.secondary);

    // Two column layout for artists
    const colWidth = (contentWidth - 10) / 2;
    let col = 0;
    let rowY = yPos;

    data.spotifyArtists.forEach((artist, index) => {
      const xPos = margin + col * (colWidth + 10);

      if (col === 0 && index > 0) {
        checkPageBreak(25);
        rowY = yPos;
      }

      // Artist box
      doc.setFillColor(COLORS.light);
      doc.roundedRect(xPos, rowY, colWidth, 20, 2, 2, "F");

      // Spotify icon indicator
      doc.setFillColor(COLORS.secondary);
      doc.circle(xPos + 8, rowY + 10, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor("#FFFFFF");
      doc.text("♪", xPos + 6.5, rowY + 12);

      // Artist name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(COLORS.text);
      doc.text(artist.name, xPos + 16, rowY + 12);

      col++;
      if (col >= 2) {
        col = 0;
        yPos = rowY + 25;
      }
    });

    if (col !== 0) {
      yPos = rowY + 25;
    }

    yPos += 10;
  }

  // =====================
  // PAGE 2: Press Quotes & Contact
  // =====================

  // Press Quotes
  if (data.pressQuotes && data.pressQuotes.length > 0) {
    checkPageBreak(40);
    drawSectionHeader("LO QUE DICEN DE NOSOTROS");

    data.pressQuotes.forEach((quote) => {
      checkPageBreak(30);

      // Quote box
      doc.setFillColor(COLORS.light);
      const quoteLines = doc.splitTextToSize(`"${quote.quote}"`, contentWidth - 20);
      const quoteHeight = quoteLines.length * 5 + 15;
      doc.roundedRect(margin, yPos, contentWidth, quoteHeight, 3, 3, "F");

      // Quote text
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(COLORS.text);

      let quoteY = yPos + 8;
      quoteLines.forEach((line: string) => {
        doc.text(line, margin + 10, quoteY);
        quoteY += 5;
      });

      // Source
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(COLORS.primary);
      doc.text(`— ${quote.source}`, margin + 10, quoteY + 2);

      yPos += quoteHeight + 8;
    });

    yPos += 5;
  }

  // Contact Information
  checkPageBreak(50);
  drawSectionHeader("CONTACTO");

  const contactInfo = [
    { label: "Email", value: data.contactEmail },
    { label: "Teléfono", value: data.contactPhone },
    { label: "Ubicación", value: data.contactLocation },
  ];

  contactInfo.forEach((info) => {
    if (info.value) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(COLORS.muted);
      doc.text(info.label + ":", margin, yPos);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.text);
      doc.text(info.value, margin + 25, yPos);

      yPos += 7;
    }
  });

  yPos += 10;

  // Social Media Links
  const socialLinks = [
    { label: "Spotify", value: data.spotifyUrl },
    { label: "Instagram", value: data.instagramUrl },
    { label: "YouTube", value: data.youtubeUrl },
    { label: "Twitter/X", value: data.twitterUrl },
    { label: "Facebook", value: data.facebookUrl },
  ].filter(s => s.value);

  if (socialLinks.length > 0) {
    checkPageBreak(30);
    drawSectionHeader("REDES SOCIALES");

    socialLinks.forEach((social) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(COLORS.primary);
      doc.text(social.label + ":", margin, yPos);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.text);
      doc.setFontSize(9);
      doc.text(social.value!, margin + 25, yPos);

      yPos += 7;
    });

    yPos += 10;
  }

  // Downloads section
  if (data.downloads && data.downloads.length > 0) {
    checkPageBreak(30);
    drawSectionHeader("RECURSOS DESCARGABLES");

    data.downloads.forEach((download) => {
      checkPageBreak(15);

      // Download item
      doc.setFillColor(COLORS.light);
      doc.roundedRect(margin, yPos, contentWidth, 12, 2, 2, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(COLORS.text);
      doc.text(download.name, margin + 5, yPos + 7);

      if (download.description) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(COLORS.muted);
        doc.text(download.description, margin + 80, yPos + 7);
      }

      yPos += 16;
    });
  }

  // =====================
  // Footer on last page
  // =====================

  // Add footer
  const footerY = pageHeight - 15;
  doc.setDrawColor(COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(COLORS.muted);
  doc.text(
    `${data.heroTitle} - Press Kit`,
    margin,
    footerY
  );

  // Generation info
  const generatedText = data.generatedAt
    ? `Generado: ${new Date(data.generatedAt).toLocaleString("es-MX", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })}${data.includesLiveData ? " • Datos en vivo" : ""}`
    : `Generado: ${new Date().toLocaleDateString("es-MX", {
        year: "numeric",
        month: "long",
        day: "numeric"
      })}`;

  doc.text(generatedText, pageWidth - margin, footerY, { align: "right" });

  // Return as Uint8Array
  const arrayBuffer = doc.output("arraybuffer");
  return new Uint8Array(arrayBuffer);
}

export function generatePressKitFilename(title: string): string {
  const date = new Date().toISOString().split("T")[0];
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${slug}-press-kit-${date}.pdf`;
}
