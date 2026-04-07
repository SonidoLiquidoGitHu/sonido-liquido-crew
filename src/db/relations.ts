import { relations } from "drizzle-orm";
import {
  users,
  sessions,
  artists,
  artistExternalProfiles,
  artistGalleryAssets,
  artistRelations,
  releases,
  releaseArtists,
  playlists,
  videos,
  events,
  products,
  orders,
  orderItems,
  subscribers,
  segments,
  emailCampaigns,
  fileAssets,
  downloadGates,
  downloadGateActions,
  mediaReleases,
  pressKit,
  syncJobs,
  syncLogs,
  tags,
  tagAssignments,
} from "./schema";
// ===========================================
// USER RELATIONS
// ===========================================
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
// ===========================================
// ARTIST RELATIONS
// ===========================================
export const artistsRelations = relations(artists, ({ many }) => ({
  externalProfiles: many(artistExternalProfiles),
  galleryAssets: many(artistGalleryAssets),
  relatedTo: many(artistRelations, { relationName: "artist" }),
  relatedFrom: many(artistRelations, { relationName: "relatedArtist" }),
  releaseArtists: many(releaseArtists),
  videos: many(videos),
  pressKit: many(pressKit),
}));
export const artistExternalProfilesRelations = relations(artistExternalProfiles, ({ one }) => ({
  artist: one(artists, {
    fields: [artistExternalProfiles.artistId],
    references: [artists.id],
  }),
}));
export const artistGalleryAssetsRelations = relations(artistGalleryAssets, ({ one }) => ({
  artist: one(artists, {
    fields: [artistGalleryAssets.artistId],
    references: [artists.id],
  }),
}));
export const artistRelationsRelations = relations(artistRelations, ({ one }) => ({
  artist: one(artists, {
    fields: [artistRelations.artistId],
    references: [artists.id],
    relationName: "artist",
  }),
  relatedArtist: one(artists, {
    fields: [artistRelations.relatedArtistId],
    references: [artists.id],
    relationName: "relatedArtist",
  }),
}));
// ===========================================
// RELEASE RELATIONS
// ===========================================
export const releasesRelations = relations(releases, ({ many }) => ({
  releaseArtists: many(releaseArtists),
  videos: many(videos),
}));
export const releaseArtistsRelations = relations(releaseArtists, ({ one }) => ({
  release: one(releases, {
    fields: [releaseArtists.releaseId],
    references: [releases.id],
  }),
  artist: one(artists, {
    fields: [releaseArtists.artistId],
    references: [artists.id],
  }),
}));
// ===========================================
// VIDEO RELATIONS
// ===========================================
export const videosRelations = relations(videos, ({ one }) => ({
  artist: one(artists, {
    fields: [videos.artistId],
    references: [artists.id],
  }),
  release: one(releases, {
    fields: [videos.releaseId],
    references: [releases.id],
  }),
}));
// ===========================================
// ORDER RELATIONS
// ===========================================
export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));
export const productsRelations = relations(products, ({ many }) => ({
  orderItems: many(orderItems),
}));
// ===========================================
// EMAIL CAMPAIGN RELATIONS
// ===========================================
export const emailCampaignsRelations = relations(emailCampaigns, ({ one }) => ({
  segment: one(segments, {
    fields: [emailCampaigns.segmentId],
    references: [segments.id],
  }),
}));
export const segmentsRelations = relations(segments, ({ many }) => ({
  campaigns: many(emailCampaigns),
}));
// ===========================================
// DOWNLOAD GATE RELATIONS
// ===========================================
export const downloadGatesRelations = relations(downloadGates, ({ one, many }) => ({
  fileAsset: one(fileAssets, {
    fields: [downloadGates.fileAssetId],
    references: [fileAssets.id],
  }),
  actions: many(downloadGateActions),
}));
export const downloadGateActionsRelations = relations(downloadGateActions, ({ one }) => ({
  downloadGate: one(downloadGates, {
    fields: [downloadGateActions.downloadGateId],
    references: [downloadGates.id],
  }),
}));
export const fileAssetsRelations = relations(fileAssets, ({ many }) => ({
  downloadGates: many(downloadGates),
}));
// ===========================================
// PRESS KIT RELATIONS
// ===========================================
// SYNC RELATIONS
// ===========================================
export const syncJobsRelations = relations(syncJobs, ({ many }) => ({
  logs: many(syncLogs),
}));
export const syncLogsRelations = relations(syncLogs, ({ one }) => ({
  syncJob: one(syncJobs, {
    fields: [syncLogs.syncJobId],
    references: [syncJobs.id],
  }),
}));
// ===========================================
// TAG RELATIONS
// ===========================================
export const tagsRelations = relations(tags, ({ many }) => ({
  assignments: many(tagAssignments),
}));
export const tagAssignmentsRelations = relations(tagAssignments, ({ one }) => ({
  tag: one(tags, {
    fields: [tagAssignments.tagId],
    references: [tags.id],
  }),
}));
