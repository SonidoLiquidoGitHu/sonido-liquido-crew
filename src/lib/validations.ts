import { z } from "zod";

// ===========================================
// BASE SCHEMAS
// ===========================================

export const uuidSchema = z.string().uuid();

export const slugSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens");

export const emailSchema = z.string().email("Invalid email address");

export const urlSchema = z.string().url("Invalid URL");

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

// ===========================================
// ARTIST SCHEMAS
// ===========================================

export const artistRoleSchema = z.enum(["mc", "dj", "producer", "cantante", "divo", "lado_b"]);

export const verificationStatusSchema = z.enum(["pending", "verified", "rejected"]);

export const createArtistSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: slugSchema.optional(),
  bio: z.string().max(5000).nullable().optional(),
  role: artistRoleSchema,
  profileImageUrl: urlSchema.nullable().optional(),
  featuredImageUrl: urlSchema.nullable().optional(),
  tintColor: z.string().max(50).nullable().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  verificationStatus: verificationStatusSchema.default("pending"),
  identityConflictFlag: z.boolean().default(false),
  adminNotes: z.string().max(2000).nullable().optional(),
});

export const updateArtistSchema = createArtistSchema.partial();

export const artistExternalProfileSchema = z.object({
  artistId: uuidSchema,
  platform: z.enum(["spotify", "youtube", "instagram", "mixcloud", "soundcloud", "twitter"]),
  externalId: z.string().max(100).nullable().optional(),
  externalUrl: urlSchema,
  handle: z.string().max(100).nullable().optional(),
  isVerified: z.boolean().default(false),
});

// ===========================================
// RELEASE SCHEMAS
// ===========================================

export const releaseTypeSchema = z.enum(["album", "ep", "single", "compilation"]);

export const createReleaseSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: slugSchema.optional(),
  releaseType: releaseTypeSchema,
  releaseDate: z.coerce.date(),
  coverImageUrl: urlSchema.nullable().optional(),
  spotifyId: z.string().max(100).nullable().optional(),
  spotifyUrl: urlSchema.nullable().optional(),
  appleMusicUrl: urlSchema.nullable().optional(),
  youtubeMusicUrl: urlSchema.nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  isUpcoming: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  artistIds: z.array(uuidSchema).min(1, "At least one artist is required"),
  primaryArtistId: uuidSchema.optional(),
});

export const updateReleaseSchema = createReleaseSchema.partial();

// ===========================================
// VIDEO SCHEMAS
// ===========================================

export const createVideoSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).nullable().optional(),
  youtubeId: z.string().min(1, "YouTube ID is required").max(20),
  youtubeUrl: urlSchema,
  thumbnailUrl: urlSchema.nullable().optional(),
  duration: z.number().int().nullable().optional(),
  viewCount: z.number().int().nullable().optional(),
  publishedAt: z.coerce.date().nullable().optional(),
  artistId: uuidSchema.nullable().optional(),
  releaseId: uuidSchema.nullable().optional(),
  isFeatured: z.boolean().default(false),
});

export const updateVideoSchema = createVideoSchema.partial();

// ===========================================
// EVENT SCHEMAS
// ===========================================

export const createEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).nullable().optional(),
  venue: z.string().min(1, "Venue is required").max(200),
  city: z.string().min(1, "City is required").max(100),
  country: z.string().min(1, "Country is required").max(100).default("México"),
  eventDate: z.coerce.date(),
  eventTime: z.string().max(20).nullable().optional(),
  ticketUrl: urlSchema.nullable().optional(),
  imageUrl: urlSchema.nullable().optional(),
  isFeatured: z.boolean().default(false),
  isCancelled: z.boolean().default(false),
});

export const updateEventSchema = createEventSchema.partial();

// ===========================================
// PRODUCT SCHEMAS
// ===========================================

export const productCategorySchema = z.enum(["music", "clothing", "accessories", "merchandise"]);

export const createProductSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  slug: slugSchema.optional(),
  description: z.string().max(5000).nullable().optional(),
  price: z.number().positive("Price must be positive"),
  compareAtPrice: z.number().positive().nullable().optional(),
  currency: z.string().length(3).default("MXN"),
  category: productCategorySchema,
  imageUrl: urlSchema.nullable().optional(),
  images: z.array(urlSchema).default([]),
  isDigital: z.boolean().default(false),
  isActive: z.boolean().default(true),
  stockQuantity: z.number().int().min(0).nullable().optional(),
});

export const updateProductSchema = createProductSchema.partial();

// ===========================================
// ORDER SCHEMAS
// ===========================================

export const orderStatusSchema = z.enum([
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

export const createOrderSchema = z.object({
  customerEmail: emailSchema,
  customerName: z.string().max(200).nullable().optional(),
  items: z
    .array(
      z.object({
        productId: uuidSchema,
        quantity: z.number().int().positive(),
      })
    )
    .min(1, "At least one item is required"),
  shippingAddress: z.string().max(1000).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateOrderSchema = z.object({
  status: orderStatusSchema.optional(),
  shippingAddress: z.string().max(1000).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

// ===========================================
// SUBSCRIBER SCHEMAS
// ===========================================

export const subscribeSchema = z.object({
  email: emailSchema,
  name: z.string().max(200).nullable().optional(),
  source: z.string().max(100).nullable().optional(),
});

// ===========================================
// DOWNLOAD GATE SCHEMAS
// ===========================================

export const downloadGateTypeSchema = z.enum(["email", "social_follow", "free"]);

export const createDownloadGateSchema = z.object({
  slug: slugSchema,
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).nullable().optional(),
  fileAssetId: uuidSchema,
  gateType: downloadGateTypeSchema,
  requireEmail: z.boolean().default(true),
  requireFollow: z.boolean().default(false),
  followUrl: urlSchema.nullable().optional(),
  isActive: z.boolean().default(true),
});

export const updateDownloadGateSchema = createDownloadGateSchema.partial();

export const unlockDownloadGateSchema = z.object({
  email: emailSchema.optional(),
  followCompleted: z.boolean().optional(),
});

// ===========================================
// MEDIA RELEASE SCHEMAS
// ===========================================

export const createMediaReleaseSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: slugSchema.optional(),
  summary: z.string().max(500).nullable().optional(),
  content: z.string().max(50000).nullable().optional(),
  coverImageUrl: urlSchema.nullable().optional(),
  publishDate: z.coerce.date(),
  isPublished: z.boolean().default(false),
});

export const updateMediaReleaseSchema = createMediaReleaseSchema.partial();

// ===========================================
// PRESS KIT SCHEMAS
// ===========================================

export const createPressKitSchema = z.object({
  artistId: uuidSchema.nullable().optional(),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).nullable().optional(),
  downloadUrl: urlSchema,
  fileSize: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const updatePressKitSchema = createPressKitSchema.partial();

// ===========================================
// PLAYLIST SCHEMAS
// ===========================================

export const createPlaylistSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).nullable().optional(),
  spotifyId: z.string().min(1, "Spotify ID is required").max(100),
  spotifyUrl: urlSchema,
  coverImageUrl: urlSchema.nullable().optional(),
  trackCount: z.number().int().min(0).default(0),
  isOfficial: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
});

export const updatePlaylistSchema = createPlaylistSchema.partial();

// ===========================================
// TAG SCHEMAS
// ===========================================

export const createTagSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  slug: slugSchema.optional(),
  category: z.string().max(50).nullable().optional(),
});

export const tagAssignmentSchema = z.object({
  tagId: uuidSchema,
  entityType: z.enum(["artist", "release", "video", "product", "event"]),
  entityId: uuidSchema,
});

// ===========================================
// SITE SETTINGS SCHEMAS
// ===========================================

export const updateSiteSettingSchema = z.object({
  value: z.string().nullable(),
});

// ===========================================
// SYNC SCHEMAS
// ===========================================

export const syncSourceSchema = z.enum(["spotify", "youtube", "dropbox"]);

export const triggerSyncSchema = z.object({
  source: syncSourceSchema,
  force: z.boolean().default(false),
});

// ===========================================
// AUTH SCHEMAS
// ===========================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ===========================================
// SEARCH SCHEMAS
// ===========================================

export const searchSchema = z.object({
  query: z.string().min(1).max(200),
  type: z.enum(["all", "artists", "releases", "videos", "products"]).default("all"),
  ...paginationSchema.shape,
});

// ===========================================
// FILTER SCHEMAS
// ===========================================

export const artistFilterSchema = z.object({
  role: artistRoleSchema.optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  verificationStatus: verificationStatusSchema.optional(),
  hasConflict: z.boolean().optional(),
  ...paginationSchema.shape,
});

export const releaseFilterSchema = z.object({
  type: releaseTypeSchema.optional(),
  artistId: uuidSchema.optional(),
  year: z.coerce.number().int().min(1990).max(2100).optional(),
  isUpcoming: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  ...paginationSchema.shape,
});

export const videoFilterSchema = z.object({
  artistId: uuidSchema.optional(),
  isFeatured: z.boolean().optional(),
  ...paginationSchema.shape,
});

export const productFilterSchema = z.object({
  category: productCategorySchema.optional(),
  isActive: z.boolean().optional(),
  isDigital: z.boolean().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  ...paginationSchema.shape,
});

export const orderFilterSchema = z.object({
  status: orderStatusSchema.optional(),
  customerEmail: emailSchema.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  ...paginationSchema.shape,
});

// ===========================================
// TYPE EXPORTS
// ===========================================

export type CreateArtistInput = z.infer<typeof createArtistSchema>;
export type UpdateArtistInput = z.infer<typeof updateArtistSchema>;
export type ArtistExternalProfileInput = z.infer<typeof artistExternalProfileSchema>;
export type CreateReleaseInput = z.infer<typeof createReleaseSchema>;
export type UpdateReleaseInput = z.infer<typeof updateReleaseSchema>;
export type CreateVideoInput = z.infer<typeof createVideoSchema>;
export type UpdateVideoInput = z.infer<typeof updateVideoSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type SubscribeInput = z.infer<typeof subscribeSchema>;
export type CreateDownloadGateInput = z.infer<typeof createDownloadGateSchema>;
export type UpdateDownloadGateInput = z.infer<typeof updateDownloadGateSchema>;
export type UnlockDownloadGateInput = z.infer<typeof unlockDownloadGateSchema>;
export type CreateMediaReleaseInput = z.infer<typeof createMediaReleaseSchema>;
export type UpdateMediaReleaseInput = z.infer<typeof updateMediaReleaseSchema>;
export type CreatePressKitInput = z.infer<typeof createPressKitSchema>;
export type UpdatePressKitInput = z.infer<typeof updatePressKitSchema>;
export type CreatePlaylistInput = z.infer<typeof createPlaylistSchema>;
export type UpdatePlaylistInput = z.infer<typeof updatePlaylistSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type TagAssignmentInput = z.infer<typeof tagAssignmentSchema>;
export type TriggerSyncInput = z.infer<typeof triggerSyncSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type ArtistFilterInput = z.infer<typeof artistFilterSchema>;
export type ReleaseFilterInput = z.infer<typeof releaseFilterSchema>;
export type VideoFilterInput = z.infer<typeof videoFilterSchema>;
export type ProductFilterInput = z.infer<typeof productFilterSchema>;
export type OrderFilterInput = z.infer<typeof orderFilterSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
