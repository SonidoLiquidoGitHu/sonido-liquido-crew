-- Migration: Add curated_playlists table
-- This allows admins to create, edit and delete playlists

CREATE TABLE IF NOT EXISTS "curated_playlists" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "description" text,
  "cover_image_url" text,
  "is_public" integer DEFAULT 1 NOT NULL,
  "is_active" integer DEFAULT 1 NOT NULL,
  "priority" integer DEFAULT 0 NOT NULL,
  "created_at" integer DEFAULT (unixepoch()) NOT NULL,
  "updated_at" integer DEFAULT (unixepoch()) NOT NULL
);

-- Insert default playlists (migrating from hardcoded list)
INSERT OR IGNORE INTO "curated_playlists" ("id", "name", "slug", "description", "is_public", "is_active", "priority")
VALUES
  ('gran-reserva', 'Gran Reserva', 'gran-reserva', 'Los mejores tracks del roster', 1, 1, 100),
  ('weekly-picks', 'Picks de la Semana', 'picks-de-la-semana', 'Selección semanal', 1, 1, 90),
  ('new-releases', 'Nuevos Lanzamientos', 'nuevos-lanzamientos', 'Lo más reciente', 1, 1, 80),
  ('classics', 'Clásicos', 'clasicos', 'Tracks clásicos del crew', 1, 1, 70),
  ('collaborations', 'Colaboraciones', 'colaboraciones', 'Featurings y colaboraciones', 1, 1, 60);
