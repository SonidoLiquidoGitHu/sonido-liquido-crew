import { db, isDatabaseConfigured } from "@/db/client";
import {
  events,
  abTestEvents,
  abTestVariants,
  abTests,
  analytics,
  artistEpk,
  artistExternalProfiles,
  artistGalleryAssets,
  artistRelations,
  artistStyles,
  artists,
  beatDownloads,
  beats,
  campaignActions,
  campaigns,
  collaborationStories,
  concertMemories,
  curatedPlaylists,
  curatedSpotifyChannels,
  curatedTracks,
  customStyles,
  downloadGateActions,
  downloadGates,
  emailCampaigns,
  emailMarketingCampaigns,
  epkPressPhotos,
  epkTracks,
  epkVideos,
  epkViews,
  fanWallMessages,
  fileAssets,
  galleryAlbums,
  galleryPhotos,
  pressKits as mediaPressKits,
  mediaReleases,
  notificationHistory,
  notificationPreferences,
  orderItems,
  orders,
  photoTags,
  playlistCollaborators,
  playlistEmbedStats,
  playlistTracks,
  presaveClicks,
  presaveSubscribers,
  pressKit as pressKitTable,
  products,
  pushSubscriptions,
  releaseArtists,
  releaseCollaborators,
  releaseNotifications,
  releases,
  scheduledNotifications,
  segments,
  siteSettings,
  socialPostQueue,
  socialPostsLog,
  storyMedia,
  subscribers,
  syncJobs,
  syncLogs,
  syncedLyricLines,
  tagAssignments,
  tags,
  trackLyrics,
  trustedContributors,
  upcomingReleases,
  userPlaylistTracks,
  userPlaylists,
  verticalVideoEvents,
  verticalVideoTags,
  verticalVideos,
  videoAnalytics,
  videoAnalyticsAggregates,
  videos,
  youtubeChannels,
} from "@/db/schema";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ============================================================
// SECTION REGISTRY
// Centralizes metadata about every exportable section so the UI
// can render groupings, badges, and live counts without hardcoding.
// ============================================================

interface SectionMeta {
  id: string;
  label: string;
  group: "content" | "community" | "commerce" | "communications" | "system";
  sensitive?: boolean;
  // Tables that compose this section (used by counts preview)
  tables: Array<{ label: string; count: () => Promise<number> }>;
  // Returns the actual payload
  export: (sanitize: boolean) => Promise<Record<string, unknown>>;
}

// Small helper to safely count any table
const count = async <T extends { length: number }>(
  q: Promise<T>,
): Promise<number> => (await q).length;

const SECTION_REGISTRY: SectionMeta[] = [
  // ---------- CONTENT ----------
  {
    id: "artists",
    label: "Artistas",
    group: "content",
    tables: [
      { label: "artists", count: () => count(db.select().from(artists)) },
      {
        label: "external_profiles",
        count: () => count(db.select().from(artistExternalProfiles)),
      },
      {
        label: "gallery_assets",
        count: () => count(db.select().from(artistGalleryAssets)),
      },
      {
        label: "relations",
        count: () => count(db.select().from(artistRelations)),
      },
    ],
    export: async () => {
      const [allArtists, allProfiles, allAssets, allRelations] =
        await Promise.all([
          db.select().from(artists),
          db.select().from(artistExternalProfiles),
          db.select().from(artistGalleryAssets),
          db.select().from(artistRelations),
        ]);
      return {
        artists: allArtists.map((a) => ({
          ...a,
          externalProfiles: allProfiles.filter((p) => p.artistId === a.id),
          galleryAssets: allAssets.filter((g) => g.artistId === a.id),
          relations: allRelations.filter((r) => r.artistId === a.id),
        })),
      };
    },
  },
  {
    id: "releases",
    label: "Lanzamientos",
    group: "content",
    tables: [
      { label: "releases", count: () => count(db.select().from(releases)) },
      {
        label: "release_artists",
        count: () => count(db.select().from(releaseArtists)),
      },
    ],
    export: async () => {
      const [allReleases, allReleaseArtists] = await Promise.all([
        db.select().from(releases),
        db.select().from(releaseArtists),
      ]);
      return {
        releases: allReleases.map((r) => ({
          ...r,
          artists: allReleaseArtists.filter((ra) => ra.releaseId === r.id),
        })),
      };
    },
  },
  {
    id: "videos",
    label: "Videos",
    group: "content",
    tables: [
      { label: "videos", count: () => count(db.select().from(videos)) },
      {
        label: "youtube_channels",
        count: () => count(db.select().from(youtubeChannels)),
      },
    ],
    export: async () => {
      const [v, ch] = await Promise.all([
        db.select().from(videos),
        db.select().from(youtubeChannels),
      ]);
      return { videos: v, youtubeChannels: ch };
    },
  },
  {
    id: "events",
    label: "Eventos",
    group: "content",
    tables: [{ label: "events", count: () => count(db.select().from(events)) }],
    export: async () => ({ events: await db.select().from(events) }),
  },
  {
    id: "gallery",
    label: "Galería",
    group: "content",
    tables: [
      { label: "albums", count: () => count(db.select().from(galleryAlbums)) },
      { label: "photos", count: () => count(db.select().from(galleryPhotos)) },
      { label: "tags", count: () => count(db.select().from(photoTags)) },
    ],
    export: async () => {
      const [albums, photos, tags] = await Promise.all([
        db.select().from(galleryAlbums),
        db.select().from(galleryPhotos),
        db.select().from(photoTags),
      ]);
      return { galleryAlbums: albums, galleryPhotos: photos, photoTags: tags };
    },
  },
  {
    id: "beats",
    label: "Beats",
    group: "content",
    tables: [
      { label: "beats", count: () => count(db.select().from(beats)) },
      {
        label: "downloads",
        count: () => count(db.select().from(beatDownloads)),
      },
    ],
    export: async () => {
      const [b, dl] = await Promise.all([
        db.select().from(beats),
        db.select().from(beatDownloads),
      ]);
      return { beats: b, beatDownloads: dl };
    },
  },
  {
    id: "media",
    label: "Comunicados / EPK",
    group: "content",
    tables: [
      {
        label: "media_releases",
        count: () => count(db.select().from(mediaReleases)),
      },
      {
        label: "press_kits",
        count: () => count(db.select().from(mediaPressKits)),
      },
      {
        label: "press_kit_legacy",
        count: () => count(db.select().from(pressKitTable)),
      },
      { label: "epk", count: () => count(db.select().from(artistEpk)) },
      {
        label: "epk_photos",
        count: () => count(db.select().from(epkPressPhotos)),
      },
      { label: "epk_tracks", count: () => count(db.select().from(epkTracks)) },
      { label: "epk_videos", count: () => count(db.select().from(epkVideos)) },
    ],
    export: async () => {
      const [mr, pk, pl, epk, photos, tracks, vids] = await Promise.all([
        db.select().from(mediaReleases),
        db.select().from(mediaPressKits),
        db.select().from(pressKitTable),
        db.select().from(artistEpk),
        db.select().from(epkPressPhotos),
        db.select().from(epkTracks),
        db.select().from(epkVideos),
      ]);
      return {
        mediaReleases: mr,
        pressKits: pk,
        pressKitLegacy: pl,
        artistEpk: epk,
        epkPressPhotos: photos,
        epkTracks: tracks,
        epkVideos: vids,
      };
    },
  },
  {
    id: "vertical_videos",
    label: "Reels / Shorts",
    group: "content",
    tables: [
      { label: "videos", count: () => count(db.select().from(verticalVideos)) },
      {
        label: "events",
        count: () => count(db.select().from(verticalVideoEvents)),
      },
      {
        label: "tags",
        count: () => count(db.select().from(verticalVideoTags)),
      },
    ],
    export: async () => {
      const [v, ev, tg] = await Promise.all([
        db.select().from(verticalVideos),
        db.select().from(verticalVideoEvents),
        db.select().from(verticalVideoTags),
      ]);
      return {
        verticalVideos: v,
        verticalVideoEvents: ev,
        verticalVideoTags: tg,
      };
    },
  },

  // ---------- COMMUNITY ----------
  {
    id: "community",
    label: "Comunidad",
    group: "community",
    tables: [
      {
        label: "fan_wall",
        count: () => count(db.select().from(fanWallMessages)),
      },
      {
        label: "user_playlists",
        count: () => count(db.select().from(userPlaylists)),
      },
      {
        label: "playlist_tracks",
        count: () => count(db.select().from(userPlaylistTracks)),
      },
      {
        label: "concert_memories",
        count: () => count(db.select().from(concertMemories)),
      },
      {
        label: "collab_stories",
        count: () => count(db.select().from(collaborationStories)),
      },
      {
        label: "story_media",
        count: () => count(db.select().from(storyMedia)),
      },
      {
        label: "track_lyrics",
        count: () => count(db.select().from(trackLyrics)),
      },
      {
        label: "synced_lines",
        count: () => count(db.select().from(syncedLyricLines)),
      },
      {
        label: "playlist_collaborators",
        count: () => count(db.select().from(playlistCollaborators)),
      },
      {
        label: "trusted_contributors",
        count: () => count(db.select().from(trustedContributors)),
      },
      {
        label: "embed_stats",
        count: () => count(db.select().from(playlistEmbedStats)),
      },
    ],
    export: async () => {
      const [fan, upl, upt, cm, cs, sm, tl, sll, pc, tc, es] =
        await Promise.all([
          db.select().from(fanWallMessages),
          db.select().from(userPlaylists),
          db.select().from(userPlaylistTracks),
          db.select().from(concertMemories),
          db.select().from(collaborationStories),
          db.select().from(storyMedia),
          db.select().from(trackLyrics),
          db.select().from(syncedLyricLines),
          db.select().from(playlistCollaborators),
          db.select().from(trustedContributors),
          db.select().from(playlistEmbedStats),
        ]);
      return {
        fanWallMessages: fan,
        userPlaylists: upl,
        userPlaylistTracks: upt,
        concertMemories: cm,
        collaborationStories: cs,
        storyMedia: sm,
        trackLyrics: tl,
        syncedLyricLines: sll,
        playlistCollaborators: pc,
        trustedContributors: tc,
        playlistEmbedStats: es,
      };
    },
  },
  {
    id: "playlists",
    label: "Playlists curadas",
    group: "community",
    tables: [
      {
        label: "channels",
        count: () => count(db.select().from(curatedSpotifyChannels)),
      },
      {
        label: "curated_tracks",
        count: () => count(db.select().from(curatedTracks)),
      },
      {
        label: "playlist_tracks",
        count: () => count(db.select().from(playlistTracks)),
      },
      {
        label: "curated_playlists",
        count: () => count(db.select().from(curatedPlaylists)),
      },
    ],
    export: async () => {
      const [ch, ct, pt, cp] = await Promise.all([
        db.select().from(curatedSpotifyChannels),
        db.select().from(curatedTracks),
        db.select().from(playlistTracks),
        db.select().from(curatedPlaylists),
      ]);
      return {
        curatedSpotifyChannels: ch,
        curatedTracks: ct,
        playlistTracks: pt,
        curatedPlaylists: cp,
      };
    },
  },

  // ---------- COMMERCE ----------
  {
    id: "products",
    label: "Tienda",
    group: "commerce",
    tables: [
      { label: "products", count: () => count(db.select().from(products)) },
      { label: "orders", count: () => count(db.select().from(orders)) },
      {
        label: "order_items",
        count: () => count(db.select().from(orderItems)),
      },
    ],
    export: async () => {
      const [p, o, oi] = await Promise.all([
        db.select().from(products),
        db.select().from(orders),
        db.select().from(orderItems),
      ]);
      return { products: p, orders: o, orderItems: oi };
    },
  },
  {
    id: "downloads",
    label: "Download Gates",
    group: "commerce",
    tables: [
      { label: "gates", count: () => count(db.select().from(downloadGates)) },
      {
        label: "actions",
        count: () => count(db.select().from(downloadGateActions)),
      },
      {
        label: "file_assets",
        count: () => count(db.select().from(fileAssets)),
      },
    ],
    export: async () => {
      const [g, a, fa] = await Promise.all([
        db.select().from(downloadGates),
        db.select().from(downloadGateActions),
        db.select().from(fileAssets),
      ]);
      return { downloadGates: g, downloadGateActions: a, fileAssets: fa };
    },
  },
  {
    id: "campaigns",
    label: "Campañas / Pre-saves",
    group: "commerce",
    tables: [
      { label: "campaigns", count: () => count(db.select().from(campaigns)) },
      {
        label: "actions",
        count: () => count(db.select().from(campaignActions)),
      },
      {
        label: "upcoming",
        count: () => count(db.select().from(upcomingReleases)),
      },
      {
        label: "presave_subs",
        count: () => count(db.select().from(presaveSubscribers)),
      },
      {
        label: "presave_clicks",
        count: () => count(db.select().from(presaveClicks)),
      },
    ],
    export: async () => {
      const [c, ca, up, ps, pc] = await Promise.all([
        db.select().from(campaigns),
        db.select().from(campaignActions),
        db.select().from(upcomingReleases),
        db.select().from(presaveSubscribers),
        db.select().from(presaveClicks),
      ]);
      return {
        campaigns: c,
        campaignActions: ca,
        upcomingReleases: up,
        presaveSubscribers: ps,
        presaveClicks: pc,
      };
    },
  },

  // ---------- COMMUNICATIONS ----------
  {
    id: "subscribers",
    label: "Suscriptores",
    group: "communications",
    sensitive: true,
    tables: [
      {
        label: "subscribers",
        count: () => count(db.select().from(subscribers)),
      },
      { label: "segments", count: () => count(db.select().from(segments)) },
      {
        label: "email_campaigns",
        count: () => count(db.select().from(emailCampaigns)),
      },
    ],
    export: async (sanitize) => {
      const [subs, segs, ec] = await Promise.all([
        db.select().from(subscribers),
        db.select().from(segments),
        db.select().from(emailCampaigns),
      ]);
      return {
        subscribers: sanitize
          ? subs.map((s) => ({
              email: s.email,
              name: s.name,
              isActive: s.isActive,
              source: s.source,
              subscribedAt: s.subscribedAt,
            }))
          : subs,
        segments: segs,
        emailCampaigns: ec,
      };
    },
  },
  {
    id: "notifications",
    label: "Notificaciones push",
    group: "communications",
    sensitive: true,
    tables: [
      {
        label: "push_subs",
        count: () => count(db.select().from(pushSubscriptions)),
      },
      {
        label: "preferences",
        count: () => count(db.select().from(notificationPreferences)),
      },
      {
        label: "scheduled",
        count: () => count(db.select().from(scheduledNotifications)),
      },
      {
        label: "history",
        count: () => count(db.select().from(notificationHistory)),
      },
      {
        label: "release_notifs",
        count: () => count(db.select().from(releaseNotifications)),
      },
    ],
    export: async () => {
      const [ps, pref, sch, hist, rn] = await Promise.all([
        db.select().from(pushSubscriptions),
        db.select().from(notificationPreferences),
        db.select().from(scheduledNotifications),
        db.select().from(notificationHistory),
        db.select().from(releaseNotifications),
      ]);
      // Always redact cryptographic subscription keys, even in non-sanitized mode.
      // The push_subscriptions table stores them as two separate columns:
      //   keys_p256dh and keys_auth — both must never leave the server.
      const redactedPush = ps.map((p) => {
        const { keysP256dh: _p, keysAuth: _a, ...rest } = p;
        return {
          ...rest,
          keysP256dh: "[redacted]",
          keysAuth: "[redacted]",
          endpoint: p.endpoint ? `${p.endpoint.slice(0, 40)}...` : null,
        };
      });
      return {
        pushSubscriptions: redactedPush,
        notificationPreferences: pref,
        scheduledNotifications: sch,
        notificationHistory: hist,
        releaseNotifications: rn,
      };
    },
  },
  {
    id: "ab_tests",
    label: "A/B Tests",
    group: "communications",
    tables: [
      { label: "tests", count: () => count(db.select().from(abTests)) },
      {
        label: "variants",
        count: () => count(db.select().from(abTestVariants)),
      },
      { label: "events", count: () => count(db.select().from(abTestEvents)) },
      {
        label: "email_marketing",
        count: () => count(db.select().from(emailMarketingCampaigns)),
      },
    ],
    export: async () => {
      const [t, v, e, emc] = await Promise.all([
        db.select().from(abTests),
        db.select().from(abTestVariants),
        db.select().from(abTestEvents),
        db.select().from(emailMarketingCampaigns),
      ]);
      return {
        abTests: t,
        abTestVariants: v,
        abTestEvents: e,
        emailMarketingCampaigns: emc,
      };
    },
  },
  {
    id: "social_posts",
    label: "Posts sociales",
    group: "communications",
    tables: [
      { label: "queue", count: () => count(db.select().from(socialPostQueue)) },
      { label: "log", count: () => count(db.select().from(socialPostsLog)) },
    ],
    export: async () => {
      const [q, l] = await Promise.all([
        db.select().from(socialPostQueue),
        db.select().from(socialPostsLog),
      ]);
      return { socialPostQueue: q, socialPostsLog: l };
    },
  },

  // ---------- SYSTEM ----------
  {
    id: "settings",
    label: "Configuración",
    group: "system",
    tables: [
      {
        label: "site_settings",
        count: () => count(db.select().from(siteSettings)),
      },
    ],
    export: async () => ({ settings: await db.select().from(siteSettings) }),
  },
  {
    id: "styles",
    label: "Estilos / Temas",
    group: "system",
    tables: [
      {
        label: "custom_styles",
        count: () => count(db.select().from(customStyles)),
      },
      {
        label: "artist_styles",
        count: () => count(db.select().from(artistStyles)),
      },
    ],
    export: async () => {
      const [cs, as] = await Promise.all([
        db.select().from(customStyles),
        db.select().from(artistStyles),
      ]);
      return { customStyles: cs, artistStyles: as };
    },
  },
  {
    id: "tags",
    label: "Tags",
    group: "system",
    tables: [
      { label: "tags", count: () => count(db.select().from(tags)) },
      {
        label: "assignments",
        count: () => count(db.select().from(tagAssignments)),
      },
    ],
    export: async () => {
      const [t, ta] = await Promise.all([
        db.select().from(tags),
        db.select().from(tagAssignments),
      ]);
      return { tags: t, tagAssignments: ta };
    },
  },
  {
    id: "sync",
    label: "Sync jobs",
    group: "system",
    tables: [
      { label: "jobs", count: () => count(db.select().from(syncJobs)) },
      { label: "logs", count: () => count(db.select().from(syncLogs)) },
    ],
    export: async () => {
      const [j, l] = await Promise.all([
        db.select().from(syncJobs),
        db.select().from(syncLogs),
      ]);
      return { syncJobs: j, syncLogs: l };
    },
  },
  {
    id: "analytics",
    label: "Analytics",
    group: "system",
    tables: [
      { label: "events", count: () => count(db.select().from(analytics)) },
      { label: "video", count: () => count(db.select().from(videoAnalytics)) },
      {
        label: "aggregates",
        count: () => count(db.select().from(videoAnalyticsAggregates)),
      },
      { label: "epk_views", count: () => count(db.select().from(epkViews)) },
    ],
    export: async () => {
      const [a, va, vaa, ev] = await Promise.all([
        db.select().from(analytics),
        db.select().from(videoAnalytics),
        db.select().from(videoAnalyticsAggregates),
        db.select().from(epkViews),
      ]);
      return {
        analytics: a,
        videoAnalytics: va,
        videoAnalyticsAggregates: vaa,
        epkViews: ev,
      };
    },
  },
];

// Tables we NEVER export, even with "all" — too sensitive or strictly internal.
const FORBIDDEN_TABLES = [
  "social_credentials", // API tokens
  "sessions", // session tokens
  "users", // auth records
] as const;

// ============================================================
// CSV HELPER
// Flattens an array of records into RFC-4180 CSV.
// Only handles flat records — nested objects are JSON-stringified.
// ============================================================
function toCSV(rows: unknown[]): string {
  if (!Array.isArray(rows) || rows.length === 0) return "";
  const sample = rows[0];
  if (typeof sample !== "object" || sample === null) return "";

  const headers = Object.keys(sample as Record<string, unknown>);

  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === "object") {
      // nested object/array → JSON string
      return JSON.stringify(val).replace(/"/g, '""');
    }
    const s = String(val);
    if (
      s.includes(",") ||
      s.includes('"') ||
      s.includes("\n") ||
      s.includes("\r")
    ) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [headers.join(",")];
  for (const row of rows) {
    const r = row as Record<string, unknown>;
    lines.push(headers.map((h) => escapeCell(r[h])).join(","));
  }
  return lines.join("\r\n");
}

// ============================================================
// MAIN ROUTE HANDLER
// Supports:
//   GET /api/admin/export?action=counts                       → preview counts
//   GET /api/admin/export?sections=all&format=json            → full JSON dump
//   GET /api/admin/export?sections=subscribers&format=csv     → CSV (single section)
//   GET /api/admin/export?sections=all&sanitize=false         → include extra fields on sensitive sections
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const sectionsParam = searchParams.get("sections") || "all";
    const format = (searchParams.get("format") || "json").toLowerCase();
    const sanitize = searchParams.get("sanitize") !== "false"; // default true

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 },
      );
    }

    // -------- ACTION: counts (preview before exporting) --------
    if (action === "counts") {
      const counts: Record<
        string,
        { label: string; tables: Array<{ label: string; count: number }> }
      > = {};
      const sectionsToCount =
        sectionsParam === "all"
          ? SECTION_REGISTRY.map((s) => s.id)
          : sectionsParam
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);

      await Promise.all(
        SECTION_REGISTRY.filter((s) => sectionsToCount.includes(s.id)).map(
          async (s) => {
            const tableCounts = await Promise.all(
              s.tables.map(async (t) => ({
                label: t.label,
                count: await t.count(),
              })),
            );
            counts[s.id] = { label: s.label, tables: tableCounts };
          },
        ),
      );

      return NextResponse.json({
        success: true,
        forbidden: FORBIDDEN_TABLES,
        counts,
      });
    }

    // -------- ACTION: list (registry metadata for the UI) --------
    if (action === "list") {
      return NextResponse.json({
        success: true,
        sections: SECTION_REGISTRY.map((s) => ({
          id: s.id,
          label: s.label,
          group: s.group,
          sensitive: !!s.sensitive,
          tables: s.tables.map((t) => t.label),
        })),
        forbidden: FORBIDDEN_TABLES,
        version: "2.0",
      });
    }

    // -------- ACTION: export --------
    const isAll = sectionsParam === "all";
    const requestedSections = isAll
      ? SECTION_REGISTRY.map((s) => s.id)
      : sectionsParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

    const selectedSections = SECTION_REGISTRY.filter((s) =>
      requestedSections.includes(s.id),
    );

    if (selectedSections.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid sections selected" },
        { status: 400 },
      );
    }

    // Run exports in parallel for speed
    const exportResults = await Promise.all(
      selectedSections.map(async (s) => ({
        id: s.id,
        data: await s.export(sanitize),
      })),
    );

    const exportData: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      version: "2.0",
      site: "Sonido Líquido Crew",
      sanitize,
      forbiddenTables: FORBIDDEN_TABLES,
    };

    // Merge section data into the top-level payload
    for (const r of exportResults) {
      exportData[r.id] = r.data;
    }

    // Build a complete summary across all exported sections
    const summary: Record<string, number> = {};
    for (const r of exportResults) {
      const payload = r.data as Record<string, unknown>;
      for (const [key, value] of Object.entries(payload)) {
        if (Array.isArray(value)) {
          summary[key] = value.length;
        }
      }
    }
    exportData.summary = summary;

    // -------- CSV format (single section only) --------
    if (format === "csv") {
      if (selectedSections.length !== 1) {
        return NextResponse.json(
          {
            success: false,
            error:
              "CSV format only supports exporting a single section at a time. Select one section.",
          },
          { status: 400 },
        );
      }
      const payload = exportResults[0].data as Record<string, unknown>;
      // Pick the largest array in the payload as the "main" table for CSV
      let mainKey: string | null = null;
      let mainLen = 0;
      for (const [key, value] of Object.entries(payload)) {
        if (Array.isArray(value) && value.length > mainLen) {
          mainKey = key;
          mainLen = value.length;
        }
      }
      if (!mainKey) {
        return NextResponse.json(
          {
            success: false,
            error: "Selected section has no tabular data to export as CSV",
          },
          { status: 400 },
        );
      }
      const csv = toCSV(payload[mainKey] as unknown[]);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${selectedSections[0].id}-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    console.error("[Export API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error exporting data",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
