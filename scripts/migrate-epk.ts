/**
 * Migration script to create EPK tables
 * Run: bun run scripts/migrate-epk.ts
 */

import { db, isDatabaseConfigured } from "../src/db/client";
import { sql } from "drizzle-orm";

async function migrateEpk() {
  if (!isDatabaseConfigured()) {
    console.error("Database not configured");
    process.exit(1);
  }

  console.log("Creating EPK tables...");

  try {
    // Create artist_epk table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS artist_epk (
        id TEXT PRIMARY KEY,
        artist_id TEXT NOT NULL UNIQUE REFERENCES artists(id) ON DELETE CASCADE,
        
        -- Identity
        tagline TEXT,
        genre_specific TEXT,
        subgenres TEXT,
        artist_type TEXT,
        
        -- Bios
        bio_short TEXT,
        bio_long TEXT,
        bio_press TEXT,
        story_highlights TEXT,
        
        -- Visual Identity
        logo_url TEXT,
        logo_transparent_url TEXT,
        logo_white_url TEXT,
        logo_black_url TEXT,
        brand_colors TEXT,
        brand_font TEXT,
        
        -- Streaming Stats
        spotify_monthly_listeners INTEGER,
        spotify_followers INTEGER,
        spotify_top_track TEXT,
        apple_music_url TEXT,
        youtube_subscribers INTEGER,
        youtube_total_views INTEGER,
        instagram_followers INTEGER,
        tiktok_followers INTEGER,
        total_streams INTEGER,
        streaming_highlights TEXT,
        
        -- Press
        press_features TEXT,
        blog_mentions TEXT,
        interview_urls TEXT,
        
        -- Playlists
        editorial_playlists TEXT,
        curated_playlists TEXT,
        
        -- Shows
        past_shows TEXT,
        festival_appearances TEXT,
        notable_venues TEXT,
        tour_history TEXT,
        
        -- Collaborations
        collaborations TEXT,
        producer_credits TEXT,
        remix_credits TEXT,
        
        -- Music
        top_tracks TEXT,
        latest_release TEXT,
        upcoming_release TEXT,
        
        -- Videos
        official_music_videos TEXT,
        live_performance_videos TEXT,
        featured_video TEXT,
        visualizer_videos TEXT,
        behind_the_scenes TEXT,
        
        -- Quotes
        press_quotes TEXT,
        artist_endorsements TEXT,
        industry_testimonials TEXT,
        
        -- Contact
        booking_email TEXT,
        booking_phone TEXT,
        management_name TEXT,
        management_email TEXT,
        management_phone TEXT,
        publicist_name TEXT,
        publicist_email TEXT,
        label_name TEXT,
        label_contact TEXT,
        
        -- Technical Rider
        performance_format TEXT,
        set_length_options TEXT,
        technical_requirements TEXT,
        backline_needs TEXT,
        stage_requirements TEXT,
        hospitality_rider TEXT,
        travel_requirements TEXT,
        
        -- Downloads
        press_kit_pdf_url TEXT,
        hi_res_photos_zip_url TEXT,
        logo_pack_zip_url TEXT,
        technical_rider_pdf_url TEXT,
        stageplot_url TEXT,
        
        -- Settings
        is_public INTEGER NOT NULL DEFAULT 0,
        custom_slug TEXT,
        theme TEXT DEFAULT 'dark',
        custom_css TEXT,
        show_contact_form INTEGER NOT NULL DEFAULT 1,
        password TEXT,
        
        -- Analytics
        view_count INTEGER NOT NULL DEFAULT 0,
        download_count INTEGER NOT NULL DEFAULT 0,
        last_viewed_at INTEGER,
        
        -- Timestamps
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    console.log("✓ Created artist_epk table");

    // Create epk_press_photos table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS epk_press_photos (
        id TEXT PRIMARY KEY,
        artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
        
        image_url TEXT NOT NULL,
        thumbnail_url TEXT,
        hi_res_url TEXT,
        
        photo_type TEXT NOT NULL DEFAULT 'portrait',
        
        title TEXT,
        description TEXT,
        photographer TEXT,
        photographer_url TEXT,
        year INTEGER,
        
        width INTEGER,
        height INTEGER,
        file_size INTEGER,
        
        is_featured INTEGER NOT NULL DEFAULT 0,
        is_primary INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    console.log("✓ Created epk_press_photos table");

    // Create epk_tracks table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS epk_tracks (
        id TEXT PRIMARY KEY,
        artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
        
        title TEXT NOT NULL,
        release_date INTEGER,
        cover_art_url TEXT,
        
        spotify_url TEXT,
        spotify_embed_code TEXT,
        apple_music_url TEXT,
        youtube_music_url TEXT,
        soundcloud_url TEXT,
        soundcloud_embed_code TEXT,
        
        stream_count INTEGER,
        description TEXT,
        
        is_featured INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    console.log("✓ Created epk_tracks table");

    // Create epk_videos table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS epk_videos (
        id TEXT PRIMARY KEY,
        artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
        
        title TEXT NOT NULL,
        video_type TEXT NOT NULL DEFAULT 'music_video',
        platform TEXT NOT NULL DEFAULT 'youtube',
        
        video_url TEXT NOT NULL,
        embed_code TEXT,
        thumbnail_url TEXT,
        
        view_count INTEGER,
        duration INTEGER,
        publish_date INTEGER,
        
        description TEXT,
        venue TEXT,
        
        is_featured INTEGER NOT NULL DEFAULT 0,
        is_primary INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    console.log("✓ Created epk_videos table");

    // Create epk_views table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS epk_views (
        id TEXT PRIMARY KEY,
        artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
        
        viewer_ip TEXT,
        viewer_user_agent TEXT,
        referrer TEXT,
        
        viewed_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    console.log("✓ Created epk_views table");

    // Create indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_epk_artist_id ON artist_epk(artist_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_epk_photos_artist_id ON epk_press_photos(artist_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_epk_tracks_artist_id ON epk_tracks(artist_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_epk_videos_artist_id ON epk_videos(artist_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_epk_views_artist_id ON epk_views(artist_id)`);
    console.log("✓ Created indexes");

    console.log("\n✅ EPK migration complete!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateEpk();
