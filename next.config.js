/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Same.new assets
      {
        protocol: "https",
        hostname: "ext.same-assets.com",
      },
      {
        protocol: "https",
        hostname: "ugc.same-assets.com",
      },
      // Spotify CDN domains - comprehensive list
      {
        protocol: "https",
        hostname: "i.scdn.co",
      },
      {
        protocol: "https",
        hostname: "mosaic.scdn.co",
      },
      {
        protocol: "https",
        hostname: "image-cdn-fa.spotifycdn.com",
      },
      {
        protocol: "https",
        hostname: "image-cdn-ak.spotifycdn.com",
      },
      {
        protocol: "https",
        hostname: "wrapped-images.spotifycdn.com",
      },
      {
        protocol: "https",
        hostname: "seeded-session-images.scdn.co",
      },
      {
        protocol: "https",
        hostname: "lineup-images.scdn.co",
      },
      {
        protocol: "https",
        hostname: "daily-mix.scdn.co",
      },
      {
        protocol: "https",
        hostname: "newjams-images.scdn.co",
      },
      {
        protocol: "https",
        hostname: "thisis-images.scdn.co",
      },
      {
        protocol: "https",
        hostname: "t.scdn.co",
      },
      {
        protocol: "https",
        hostname: "*.scdn.co",
      },
      // Specific Spotify CDN domains from oembed
      {
        protocol: "https",
        hostname: "image-cdn-ak.spotifycdn.com",
      },
      {
        protocol: "https",
        hostname: "image-cdn-fa.spotifycdn.com",
      },
      {
        protocol: "https",
        hostname: "image-cdn-eu.spotifycdn.com",
      },
      {
        protocol: "https",
        hostname: "image-cdn-as.spotifycdn.com",
      },
      {
        protocol: "https",
        hostname: "image-cdn-na.spotifycdn.com",
      },
      // YouTube images
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "yt3.ggpht.com",
      },
      {
        protocol: "https",
        hostname: "yt3.googleusercontent.com",
      },
      // Dropbox
      {
        protocol: "https",
        hostname: "dl.dropboxusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.dropbox.com",
      },
      // Other sources
      {
        protocol: "https",
        hostname: "doble-h.com",
      },
      {
        protocol: "https",
        hostname: "f4.bcbits.com",
      },
      // Unsplash for fallbacks
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "source.unsplash.com",
      },
      // Placeholder images
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
      },
    ],
    // Image optimization settings
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600, // 1 hour cache - Next.js Image optimization caches on CDN for fast repeat loads
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Enable image optimization for better performance (WebP/AVIF conversion, CDN caching)
    // The image-proxy route now returns proper content-type headers,
    // so Next.js Image optimization works correctly with proxied URLs.
    unoptimized: false,
  },
  // Required for @libsql/client in serverless
  serverExternalPackages: ["@libsql/client", "@libsql/client/web"],
  // Improve build performance
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true, // ESLint 10 + FlatCompat circular JSON issue (known Next.js 16 bug)
  },

  // Enable compression
  compress: true,
  // Optimize production builds
  productionBrowserSourceMaps: false,
  // Experimental features for performance
  experimental: {
    // Optimize package imports
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "sonner",
    ],
    // Body size limit for large file uploads (audio, video) via API routes
    // Default is too small for MP3 uploads. 150MB matches the
    // Dropbox upload route's MAX_UPLOAD_SIZE.
    serverActions: {
      bodySizeLimit: "150mb",
    },
  },
  // Headers for caching
  async headers() {
    return [
      {
        // Cache static assets aggressively
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Cache fonts
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Cache Next.js static files
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // NOTE: Image proxy caching is handled by the API route itself.
      // Successful responses get aggressive caching (max-age=86400).
      // Error responses get no-store to prevent temporary failures from being cached.
      // This rule MUST come before the /api/:path* catch-all, which would otherwise
      // override with no-store and prevent any browser/CDN caching of images.
      {
        source: "/api/image-proxy",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        // Video proxy - cache for 1 hour, stale OK for 24 hours
        // CRITICAL: Must come before the general /api/:path* no-store rule!
        // Without this, videos are never cached and must be re-fetched every time,
        // causing slow loading and failed playback on mobile.
        source: "/api/video-proxy",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // API routes - no CDN caching to prevent stale data
        // NOTE: Specific proxy routes above must be listed BEFORE this catch-all
        // Without this, videos are never cached and must be re-fetched every time,
        // causing slow loading and failed playback on mobile.
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
        ],
      },
      {
        // HTML pages — never let the browser or Netlify's edge CDN serve a
        // stale copy of a page after an admin mutation.
        // We pair this with revalidatePath() calls in the admin API routes so
        // that deletes / edits / creations instantly propagate to the public
        // site instead of waiting for the ISR timer (5 min on the homepage).
        // The rule comes BEFORE the /:path* security catch-all so it wins
        // for HTML pages, but /api/:path* above still wins for API routes.
        source: "/((?!api|_next|images|fonts|icons|favicon).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        // Security headers for all routes
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
  // Logging for debugging (only in development)
  logging: process.env.NODE_ENV === "development" ? {
    fetches: {
      fullUrl: true,
    },
  } : undefined,
};
module.exports = nextConfig;
