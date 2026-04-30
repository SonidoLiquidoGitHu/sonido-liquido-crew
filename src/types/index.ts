// ===========================================
// CORE TYPES
// ===========================================

export type UUID = string;

export type VerificationStatus = "pending" | "verified" | "rejected";

export type ArtistRole = "mc" | "dj" | "producer" | "cantante" | "divo" | "lado_b";

export type ReleaseType = "album" | "ep" | "single" | "maxi-single" | "compilation" | "mixtape";

export type SyncStatus = "pending" | "running" | "completed" | "failed";

export type SyncSource = "spotify" | "youtube" | "dropbox";

export type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled" | "refunded";

export type DownloadGateType = "email" | "social_follow" | "free";

// ===========================================
// ARTIST TYPES
// ===========================================

export interface Artist {
  id: UUID;
  name: string;
  slug: string;
  bio: string | null;
  role: ArtistRole;
  profileImageUrl: string | null;
  featuredImageUrl: string | null;
  tintColor: string | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  verificationStatus: VerificationStatus;
  identityConflictFlag: boolean;
  adminNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArtistExternalProfile {
  id: UUID;
  artistId: UUID;
  platform: "spotify" | "youtube" | "instagram" | "mixcloud" | "soundcloud" | "twitter";
  externalId: string | null;
  externalUrl: string;
  handle: string | null;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArtistGalleryAsset {
  id: UUID;
  artistId: UUID;
  assetUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArtistRelation {
  id: UUID;
  artistId: UUID;
  relatedArtistId: UUID;
  relationType: "collaborator" | "alias" | "member_of" | "featured";
  createdAt: Date;
}

export interface ArtistWithDetails extends Artist {
  externalProfiles: ArtistExternalProfile[];
  galleryAssets: ArtistGalleryAsset[];
  relatedArtists: Artist[];
  releases: Release[];
  releaseCount: number;
}

// ===========================================
// RELEASE TYPES
// ===========================================

export interface Release {
  id: UUID;
  title: string;
  slug: string;
  releaseType: ReleaseType;
  releaseDate: Date;
  coverImageUrl: string | null;
  spotifyId: string | null;
  spotifyUrl: string | null;
  appleMusicUrl: string | null;
  youtubeMusicUrl: string | null;
  description: string | null;
  isUpcoming: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReleaseArtist {
  id: UUID;
  releaseId: UUID;
  artistId: UUID;
  isPrimary: boolean;
  createdAt: Date;
}

export interface ReleaseWithArtists extends Release {
  artists: Artist[];
  primaryArtist: Artist | null;
}

// ===========================================
// PLAYLIST TYPES
// ===========================================

export interface Playlist {
  id: UUID;
  name: string;
  description: string | null;
  spotifyId: string;
  spotifyUrl: string;
  coverImageUrl: string | null;
  trackCount: number;
  isOfficial: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================================
// VIDEO TYPES
// ===========================================

export interface Video {
  id: UUID;
  title: string;
  description: string | null;
  youtubeId: string;
  youtubeUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  viewCount: number | null;
  publishedAt: Date | null;
  artistId: UUID | null;
  releaseId: UUID | null;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VideoWithRelations extends Video {
  artist: Artist | null;
  release: Release | null;
}

// ===========================================
// EVENT TYPES
// ===========================================

export interface Event {
  id: UUID;
  title: string;
  description: string | null;
  venue: string;
  city: string;
  country: string;
  eventDate: Date;
  eventTime: string | null;
  ticketUrl: string | null;
  imageUrl: string | null;
  isFeatured: boolean;
  isCancelled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================================
// PRODUCT TYPES
// ===========================================

export interface Product {
  id: UUID;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  category: "music" | "clothing" | "accessories" | "merchandise";
  imageUrl: string | null;
  images: string[] | null;
  stripeProductId: string | null;
  stripePriceId: string | null;
  isDigital: boolean;
  isActive: boolean;
  isFeatured: boolean;
  stockQuantity: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================================
// ORDER TYPES
// ===========================================

export interface Order {
  id: UUID;
  orderNumber: string;
  customerEmail: string;
  customerName: string | null;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  shippingAddress: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: UUID;
  orderId: UUID;
  productId: UUID;
  quantity: number;
  unitPrice: number;
  total: number;
  createdAt: Date;
}

export interface OrderWithItems extends Order {
  items: (OrderItem & { product: Product })[];
}

// ===========================================
// SUBSCRIBER TYPES
// ===========================================

export interface Subscriber {
  id: UUID;
  email: string;
  name: string | null;
  isActive: boolean;
  mailchimpId: string | null;
  source: string | null;
  subscribedAt: Date;
  unsubscribedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================================
// DOWNLOAD GATE TYPES
// ===========================================

export interface DownloadGate {
  id: UUID;
  slug: string;
  title: string;
  description: string | null;
  fileAssetId: UUID;
  gateType: DownloadGateType;
  requireEmail: boolean;
  requireFollow: boolean;
  followUrl: string | null;
  isActive: boolean;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DownloadGateAction {
  id: UUID;
  downloadGateId: UUID;
  email: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  downloadedAt: Date;
  createdAt: Date;
}

// ===========================================
// MEDIA RELEASE TYPES
// ===========================================

export interface MediaRelease {
  id: UUID;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  coverImageUrl: string | null;
  publishDate: Date;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================================
// PRESS KIT TYPES
// ===========================================

export interface PressKit {
  id: UUID;
  artistId: UUID | null;
  title: string;
  description: string | null;
  downloadUrl: string;
  fileSize: number | null;
  isActive: boolean;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================================
// FILE ASSET TYPES
// ===========================================

export interface FileAsset {
  id: UUID;
  filename: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  storageProvider: "dropbox" | "local" | "s3";
  storagePath: string;
  publicUrl: string | null;
  isPublic: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================================
// SYNC TYPES
// ===========================================

export interface SyncJob {
  id: UUID;
  source: SyncSource;
  status: SyncStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  itemsProcessed: number;
  itemsFailed: number;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncLog {
  id: UUID;
  syncJobId: UUID;
  level: "info" | "warning" | "error";
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

// ===========================================
// ANALYTICS TYPES
// ===========================================

export interface AnalyticsEvent {
  id: UUID;
  eventType: string;
  entityType: string | null;
  entityId: UUID | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

// ===========================================
// TAG TYPES
// ===========================================

export interface Tag {
  id: UUID;
  name: string;
  slug: string;
  category: string | null;
  createdAt: Date;
}

export interface TagAssignment {
  id: UUID;
  tagId: UUID;
  entityType: "artist" | "release" | "video" | "product" | "event";
  entityId: UUID;
  createdAt: Date;
}

// ===========================================
// SITE SETTINGS TYPES
// ===========================================

export interface SiteSetting {
  id: UUID;
  key: string;
  value: string | null;
  type: "string" | "number" | "boolean" | "json";
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================================
// USER TYPES
// ===========================================

export interface User {
  id: UUID;
  email: string;
  passwordHash: string;
  name: string | null;
  role: "admin" | "editor" | "viewer";
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: UUID;
  userId: UUID;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

// ===========================================
// API RESPONSE TYPES
// ===========================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ===========================================
// DASHBOARD TYPES
// ===========================================

export interface DashboardSummary {
  totalArtists: number;
  totalReleases: number;
  totalVideos: number;
  totalProducts: number;
  totalOrders: number;
  totalSubscribers: number;
  totalDownloads: number;
  recentOrders: OrderWithItems[];
  latestReleases: ReleaseWithArtists[];
  syncHealth: {
    spotify: SyncJob | null;
    youtube: SyncJob | null;
    dropbox: SyncJob | null;
  };
  analytics: {
    totalViews: number;
    totalDownloads: number;
    conversionRate: number;
  };
  releasesPerYear: { year: number; count: number }[];
  releasesPerArtist: { artistId: string; artistName: string; count: number }[];
}

// ===========================================
// SPOTIFY API TYPES
// ===========================================

export interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string; width: number; height: number }[];
  genres: string[];
  popularity: number;
  external_urls: { spotify: string };
  followers: { total: number };
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: "album" | "single" | "compilation";
  release_date: string;
  images: { url: string; width: number; height: number }[];
  artists: { id: string; name: string }[];
  external_urls: { spotify: string };
  total_tracks: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  artists: { id: string; name: string }[];
  album: SpotifyAlbum;
  external_urls: { spotify: string };
  preview_url: string | null;
}

// ===========================================
// YOUTUBE API TYPES
// ===========================================

export interface YouTubeVideo {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
      maxres?: { url: string; width: number; height: number };
    };
    channelId: string;
    channelTitle: string;
  };
  contentDetails: {
    duration: string;
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
}

export interface YouTubeChannel {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      default: { url: string };
      medium: { url: string };
      high: { url: string };
    };
    customUrl: string;
  };
  statistics: {
    subscriberCount: string;
    videoCount: string;
    viewCount: string;
  };
}
