// Services barrel file - exports all services
export const artistsService = {
  getAll: async () => [],
  getById: async () => null,
  getBySlug: async () => null,
  getFeatured: async () => [],
  getWithConflicts: async () => [],
  search: async () => [],
  getCount: async () => 0,
  syncFromSpotify: async () => null,
};

export const releasesService = {
  getAll: async () => [],
  getBySlug: async () => null,
  getUpcoming: async () => [],
  getNextUpcoming: async () => null,
  getFeatured: async () => [],
  getLatest: async () => [],
  getByYear: async () => [],
  getByArtist: async () => [],
  getCount: async () => 0,
  getStats: async () => ({ total: 0, albums: 0, singles: 0, maxiSingles: 0, eps: 0, compilations: 0, mixtapes: 0 }),
  search: async () => [],
};

export const videosService = {
  getAll: async () => [],
  getById: async () => null,
  getFeatured: async () => [],
  getCount: async () => 0,
  syncFromYouTube: async () => null,
};

export const eventsService = {
  getAll: async () => [],
  getUpcoming: async () => [],
  getPast: async () => [],
  getById: async () => null,
};

export const productsService = {
  getAll: async () => [],
  getBySlug: async () => null,
  getCount: async () => 0,
};

export const subscribersService = {
  subscribe: async () => null,
  unsubscribe: async () => null,
  getCount: async () => 0,
};

export const playlistsService = {
  getAll: async () => [],
  syncFromSpotify: async () => null,
};

export const dashboardService = {
  getSummary: async () => ({
    totalArtists: 0,
    totalReleases: 0,
    totalVideos: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalSubscribers: 0,
    totalDownloads: 0,
    recentOrders: [],
    latestReleases: [],
    syncHealth: { spotify: null, youtube: null, dropbox: null },
    analytics: { totalViews: 0, totalDownloads: 0, conversionRate: 0 },
    releasesPerYear: [],
    releasesPerArtist: [],
    upcomingStats: { activeReleases: 0, totalPresaves: 0, topRelease: null },
  }),
};

export const beatsService = {
  getFeatured: async () => [],
  getAll: async () => [],
  getBySlug: async () => null,
};

export const upcomingReleasesService = {
  getActive: async () => [],
  getFeatured: async () => [],
  getByArtistName: async () => [],
  getBySlug: async () => null,
  incrementPresaveCount: async () => {},
};

export const siteSettingsService = {
  get: async () => null,
  set: async () => null,
  getAll: async () => [],
  getSiteInfo: async () => ({}),
};
