import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";
import { artists } from "./artists";
import { tags } from "./tags";

export const galleryAlbums = sqliteTable("gallery_albums", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  coverPhotoId: text("cover_photo_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  isPublished: integer("is_published", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const galleryPhotos = sqliteTable("gallery_photos", {
  id: text("id").primaryKey(),
  title: text("title"),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  width: integer("width"),
  height: integer("height"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  albumId: text("album_id").references(() => galleryAlbums.id, { onDelete: "set null" }),
  artistId: text("artist_id").references(() => artists.id, { onDelete: "set null" }),
  photographer: text("photographer"),
  location: text("location"),
  takenAt: integer("taken_at", { mode: "timestamp" }),
  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
  isPublished: integer("is_published", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  altText: text("alt_text"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const photoTags = sqliteTable("photo_tags", {
  id: text("id").primaryKey(),
  photoId: text("photo_id").notNull().references(() => galleryPhotos.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const galleryAlbumsRelations = relations(galleryAlbums, ({ many }) => ({
  photos: many(galleryPhotos),
}));

export const galleryPhotosRelations = relations(galleryPhotos, ({ one, many }) => ({
  album: one(galleryAlbums, { fields: [galleryPhotos.albumId], references: [galleryAlbums.id] }),
  artist: one(artists, { fields: [galleryPhotos.artistId], references: [artists.id] }),
  photoTags: many(photoTags),
}));

export const photoTagsRelations = relations(photoTags, ({ one }) => ({
  photo: one(galleryPhotos, { fields: [photoTags.photoId], references: [galleryPhotos.id] }),
  tag: one(tags, { fields: [photoTags.tagId], references: [tags.id] }),
}));

export type GalleryAlbum = typeof galleryAlbums.$inferSelect;
export type NewGalleryAlbum = typeof galleryAlbums.$inferInsert;
export type GalleryPhoto = typeof galleryPhotos.$inferSelect;
export type NewGalleryPhoto = typeof galleryPhotos.$inferInsert;
export type PhotoTag = typeof photoTags.$inferSelect;
export type NewPhotoTag = typeof photoTags.$inferInsert;
