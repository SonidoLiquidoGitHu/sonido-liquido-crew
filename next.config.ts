import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // When deploying to Netlify with @netlify/plugin-nextjs, do NOT use "standalone" output.
  // The plugin handles serverless function generation automatically.
  // Keep this commented out for Netlify deployments.
  // output: "standalone",

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.scdn.co", pathname: "/image/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "mosaic.scdn.co", pathname: "/**" },
      { protocol: "https", hostname: "dl.dropboxusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/**" },
      { protocol: "https", hostname: "img.youtube.com", pathname: "/**" },
    ],
  },

  reactStrictMode: true,
};

export default nextConfig;
