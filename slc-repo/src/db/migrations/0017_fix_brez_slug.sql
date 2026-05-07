-- Migration 0017: Fix Brez artist slug
-- The artist "Brez" was stored with slug "bresz" (typo) instead of "brez"
-- This causes 404 errors on the discography page because the roster lookup
-- uses slug "brez" while the DB has "bresz"
UPDATE artists SET slug = 'brez', name = 'Brez' WHERE slug = 'bresz';
